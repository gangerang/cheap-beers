const LOAD_COUNT = 48;
const dataUrl = "https://raw.githubusercontent.com/gangerang/alculator-data/master/beer_corrected.json";

new Vue({
  el: '#app',
  data: {
    beers: [],
    searchQuery: "",
    displayLimit: LOAD_COUNT,
    includeSpecials: true,  // Specials are included by default.
    selectedPackages: ["single", "pack", "case"],  // All package types selected by default.
    selectedVessels: ["can", "bottle", "longneck"]  // All vessel types selected by default.
  },
  computed: {
    // Filter out invalid items, online_only beers, apply search, then filter by specials, package and vessel.
    filteredBeers() {
      let available = this.beers.filter(beer => {
        return beer && typeof beer === "object" &&
               beer.name && typeof beer.name === "string" &&
               beer.online_only !== true;
      });
      
      if (this.searchQuery) {
        const query = this.searchQuery.trim().toLowerCase();
        available = available.filter(beer => beer.name.toLowerCase().includes(query));
      }
      
      if (!this.includeSpecials) {
        available = available.filter(beer => beer.special === false);
      }
      
      // Filter by package.
      if (this.selectedPackages.length === 0) {
        available = [];
      } else {
        available = available.filter(beer => {
          let pkg = (beer.package || "").toLowerCase();
          return this.selectedPackages.includes(pkg);
        });
      }
      
      // Filter by vessel. Default vessel is "bottle" if not provided.
      if (this.selectedVessels.length === 0) {
        available = [];
      } else {
        available = available.filter(beer => {
          let vessel = (beer.vessel || "bottle").toLowerCase();
          return this.selectedVessels.includes(vessel);
        });
      }
      
      return available.slice().sort((a, b) => {
        let aVal = (a.cost_per_standard !== undefined && a.cost_per_standard !== null) ? parseFloat(a.cost_per_standard) : 0;
        let bVal = (b.cost_per_standard !== undefined && b.cost_per_standard !== null) ? parseFloat(b.cost_per_standard) : 0;
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
      const index = this.selectedPackages.indexOf(pkg);
      if (index === -1) {
        this.selectedPackages.push(pkg);
      } else {
        this.selectedPackages.splice(index, 1);
      }
    },
    toggleVessel(vessel) {
      const index = this.selectedVessels.indexOf(vessel);
      if (index === -1) {
        this.selectedVessels.push(vessel);
      } else {
        this.selectedVessels.splice(index, 1);
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
    // Returns packaging info based on beer type.
    packagingInfo(beer) {
      const size = beer.size;
      const vessel = beer.vessel ? beer.vessel.toLowerCase() : "bottle";
      const pkg = (beer.package || "").toLowerCase();
      if (pkg === "single") {
        return `${size}mL ${vessel}`;
      } else {
        return `${beer.package_size} x ${size}mL ${vessel}`;
      }
    }
  },
  created() {
    this.fetchData();
  }
});
