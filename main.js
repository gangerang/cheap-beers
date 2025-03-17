const LOAD_COUNT = 48;
const dataUrl = "https://raw.githubusercontent.com/gangerang/alculator-data/master/datasets_cleaned/beer_cleaned.json";

new Vue({
  el: '#app',
  data: {
    beers: [],
    searchQuery: "",
    displayLimit: LOAD_COUNT,
    includeSpecials: true,            // Default: specials are included.
    selectedPackages: ["single", "pack", "case"],  // Default packages.
    selectedVessels: ["can", "bottle", "longneck"]   // Default vessels.
  },
  computed: {
    filteredBeers() {
      // Filter out invalid beer entries.
      let available = this.beers.filter(beer => {
        return beer && typeof beer === "object" &&
               beer.name && typeof beer.name === "string" &&
               beer.online_only !== true;
      });
      
      // Search filter: split query into words and check that every word appears
      // somewhere in the concatenated searchable fields.
      if (this.searchQuery) {
        const words = this.searchQuery.trim().toLowerCase().split(/\s+/);
        available = available.filter(beer => {
          const searchable = [
            beer.name || '',
            beer.vessel || '',
            beer.package || '',
            beer.size ? beer.size.toString() : '',
            beer.package_size ? beer.package_size.toString() : ''
          ].join(' ').toLowerCase();
          return words.every(word => searchable.includes(word));
        });
      }
      
      // Filter out specials if includeSpecials is false.
      if (!this.includeSpecials) {
        available = available.filter(beer => beer.special === false);
      }
      
      // Filter by package types (only if at least one is selected).
      if (this.selectedPackages.length === 0) {
        available = [];
      } else {
        available = available.filter(beer => {
          let pkg = (beer.package || "").toLowerCase();
          return this.selectedPackages.includes(pkg);
        });
      }
      
      // Filter by vessel types (only if at least one is selected).
      if (this.selectedVessels.length === 0) {
        available = [];
      } else {
        available = available.filter(beer => {
          let vessel = (beer.vessel || "bottle").toLowerCase();
          return this.selectedVessels.includes(vessel);
        });
      }
      
      // Sort beers by cost per standard.
      return available.slice().sort((a, b) => {
        let aVal = (a.cost_per_standard != null) ? parseFloat(a.cost_per_standard) : 0;
        let bVal = (b.cost_per_standard != null) ? parseFloat(b.cost_per_standard) : 0;
        if (isNaN(aVal)) aVal = 0;
        if (isNaN(bVal)) bVal = 0;
        return aVal - bVal;
      });
    },
    displayedBeers() {
      return this.filteredBeers.slice(0, this.displayLimit);
    }
  },
  methods: {
    // Existing methods for image URL, error handling, supplier URL, etc.
    getImageUrl(stockcode) {
      if (!stockcode) return "";
      let code = stockcode.toString();
      if (code.startsWith("ER_")) code = code.slice(3);
      return `https://media.danmurphys.com.au/dmo/product/${code}-1.png`;
    },
    getAltImageUrl(stockcode) {
      if (!stockcode) return "";
      let code = stockcode.toString();
      if (code.startsWith("ER_")) code = code.slice(3);
      code = code.replace(/_/g, '-');
      return `https://media.danmurphys.com.au/dmo/product/${code}-1.png`;
    },
    handleImageError(event, stockcode) {
      const altSrc = this.getAltImageUrl(stockcode);
      if (event.target.src !== altSrc) {
        event.target.src = altSrc;
      } else {
        event.target.src = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2248%22>🍺</text></svg>";
      }
    },
    supplierUrl(stockcode) {
      if (!stockcode) return "#";
      return `https://www.danmurphys.com.au/product/${stockcode}`;
    },
    loadMore() {
      this.displayLimit += LOAD_COUNT;
    },
    toggleSpecials() {
      this.includeSpecials = !this.includeSpecials;
    },
    togglePackage(pkg) {
      const allPackages = ["single", "pack", "case"];
      if (this.selectedPackages.length === allPackages.length) {
        // All selected: clicking one selects only that one.
        this.selectedPackages = [pkg];
      } else if (this.selectedPackages.length === 1 && this.selectedPackages[0] === pkg) {
        // If only one is active and it's clicked again, reset to all.
        this.selectedPackages = [...allPackages];
      } else {
        // Multi-select mode:
        if (this.selectedPackages.includes(pkg)) {
          // Remove the filter.
          this.selectedPackages = this.selectedPackages.filter(p => p !== pkg);
          // If removal would leave none selected, reset to all.
          if (this.selectedPackages.length === 0) {
            this.selectedPackages = [...allPackages];
          }
        } else {
          // Add the newly clicked filter.
          this.selectedPackages.push(pkg);
        }
      }
    },    
    toggleVessel(vessel) {
      const allVessels = ["can", "bottle", "longneck"];
      if (this.selectedVessels.length === allVessels.length) {
        this.selectedVessels = [vessel];
      } else if (this.selectedVessels.length === 1 && this.selectedVessels[0] === vessel) {
        this.selectedVessels = [...allVessels];
      } else {
        if (this.selectedVessels.includes(vessel)) {
          this.selectedVessels = this.selectedVessels.filter(v => v !== vessel);
          if (this.selectedVessels.length === 0) {
            this.selectedVessels = [...allVessels];
          }
        } else {
          this.selectedVessels.push(vessel);
        }
      }
    },    
    resetFilters() {
      this.searchQuery = "";
      this.includeSpecials = true;
      this.selectedPackages = ["single", "pack", "case"];
      this.selectedVessels = ["can", "bottle", "longneck"];
    },
    fetchData() {
      fetch(dataUrl)
        .then(response => response.json())
        .then(data => {
          this.beers = Array.isArray(data) ? data.filter(item => item && item.name) : [];
        })
        .catch(error => console.error("Error loading JSON data:", error));
    },
    clearSearch() {
      this.searchQuery = "";
    },
    formatPrice(value) {
      const num = parseFloat(value);
      if (isNaN(num)) return "N/A";
      if (num === Math.floor(num)) {
        return num.toString();
      }
      return num.toFixed(2);
    },
    packagingInfo(beer) {
      const size = beer.size;
      const vessel = beer.vessel ? beer.vessel.toLowerCase() : "bottle";
      const pkg = (beer.package || "").toLowerCase();
      if (pkg === "single") {
        return `${size}mL ${vessel}`;
      } else {
        return `${beer.package_size} x ${size}mL ${vessel}`;
      }
    },
    // NEW: Build a shareable URL that includes search and filter params.
    buildShareUrl() {
      const params = new URLSearchParams();
      
      // Always include the search query if present.
      if (this.searchQuery) {
        params.set("q", this.searchQuery);
      }
      
      // Only include includeSpecials if it's not the default (true).
      if (this.includeSpecials !== true) {
        params.set("specials", this.includeSpecials);
      }
      
      // Only include packages if they differ from the default.
      const defaultPackages = ["single", "pack", "case"];
      if (this.selectedPackages.slice().sort().join(",") !== defaultPackages.slice().sort().join(",")) {
        params.set("packages", this.selectedPackages.join(","));
      }
      
      // Only include vessels if they differ from the default.
      const defaultVessels = ["can", "bottle", "longneck"];
      if (this.selectedVessels.slice().sort().join(",") !== defaultVessels.slice().sort().join(",")) {
        params.set("vessels", this.selectedVessels.join(","));
      }
      
      // Construct the URL using the current origin and path.
      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
      return shareUrl;
    },
    // NEW: Copy the shareable URL to the clipboard.
    copyUrl() {
      const shareUrl = this.buildShareUrl();
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert("URL copied to clipboard:\n" + shareUrl);
      }).catch(err => {
        console.error("Error copying URL: ", err);
      });
    },
    // NEW: Apply URL parameters (if any) to pre-populate the search state.
    applyUrlParams() {
      const params = new URLSearchParams(window.location.search);
      if (params.has("q")) {
        this.searchQuery = params.get("q");
      }
      if (params.has("specials")) {
        this.includeSpecials = params.get("specials") === "true";
      }
      if (params.has("packages")) {
        this.selectedPackages = params.get("packages").split(",");
      }
      if (params.has("vessels")) {
        this.selectedVessels = params.get("vessels").split(",");
      }
    }
  },
  created() {
    // On load, apply any URL parameters then fetch the beer data.
    this.applyUrlParams();
    this.fetchData();
  }
});
