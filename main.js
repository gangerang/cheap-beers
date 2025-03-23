const LOAD_COUNT = 48;
const dataUrl = "https://raw.githubusercontent.com/gangerang/alculator-data/master/datasets_cleaned/beer.json";

new Vue({
  el: '#app',
  data: {
    beers: [],
    searchQuery: "",
    displayLimit: LOAD_COUNT,
    includeSpecials: true,            // Specials filter: when true, use special pricing if available.
    selectedPackages: ["single", "pack", "case"],  // Filter by base package type.
    selectedVessels: ["can", "bottle", "longneck"],
    selectedStrengths: ["Light", "Mid", "Full", "Extra full"],
    selectedRatings: ["Undrinkable", "Ok / Good", "Great!", "Legendary"],
  },
  computed: {
    // Flatten each beer record into separate pricing “cards.”
    flattenedBeers() {
      let result = [];
      this.beers.forEach(beer => {
        if (!beer.properties || !beer.pricing) return;
        // For filtering, get the vessel from properties (default to "bottle" if missing).
        let vessel = beer.properties.vessel ? beer.properties.vessel.toLowerCase() : "bottle";
        // Loop through each base package type.
        ["single", "pack", "case"].forEach(pkgType => {
          // Only process if this package is selected in the filters.
          if (!this.selectedPackages.includes(pkgType)) return;
          let pricingData = null;
          let isSpecial = false;
          // Use special pricing if available and the filter is active.
          if (this.includeSpecials && beer.pricing[`${pkgType}_special`]) {
            pricingData = beer.pricing[`${pkgType}_special`];
            isSpecial = true;
          } else if (beer.pricing[pkgType]) {
            pricingData = beer.pricing[pkgType];
          }
          const strengthCategory = this.computeStrengthCategory(beer.properties.percentage_raw);
          const strengthIcon = this.computeStrengthEmoji(strengthCategory);
          const ratingText = this.mapRatingText(beer.properties.rating);
          const ratingCategory = this.mapRatingCategory(ratingText);
          // If pricing exists, add the flattened card.
          if (pricingData) {
            result.push({
              stockcode: beer.stockcode,
              name: beer.properties.name,
              name_clean: beer.properties.name_clean,
              brand: beer.properties.brand,
              size: beer.properties.size_clean,                // Use the clean size.
              percentage: beer.properties.percentage_raw,        // Use raw percentage.
              strengthCategory,
              strengthIcon,
              standard_drinks: beer.properties.standard_drinks_clean, // Use clean standard drinks.
              vessel: beer.properties.vessel,
              // Build the full image URL using the provided image name.
              image_url: "https://media.danmurphys.com.au/dmo/product/" + beer.properties.image_url,
              // Map numeric rating to word.
              ratingText,
              ratingCategory,
              // Removed IBU and beer_style.
              package: pkgType,
              package_special: isSpecial,                        // Flag indicating special pricing.
              package_size: pricingData.units,                   // Units per package.
              total_price: pricingData.total_price,
              unit_price: pricingData.unit_price,
              cost_per_standard: pricingData.cost_per_standard,
              alcohol_tax_cost: pricingData.alcohol_tax_cost,
              alcohol_tax_percent: pricingData.alcohol_tax_percent
            });
          }
        });
      });
      return result;
    },
    // Apply search, vessel filtering and sort on the flattened beer cards.
    filteredBeers() {
      let available = this.flattenedBeers.filter(beer => beer && beer.name);

      // Filter by vessel.
      if (this.selectedVessels.length > 0) {
        available = available.filter(beer => {
          let vessel = (beer.vessel || "bottle").toLowerCase();
          return this.selectedVessels.includes(vessel);
        });
      }

      // Filter by strength category.
      if (this.selectedStrengths.length > 0) {
        available = available.filter(beer => this.selectedStrengths.includes(beer.strengthCategory));
      }

      // Filter by ratingCategory
      if (this.selectedRatings.length > 0) {
        available = available.filter(beer => {
          return this.selectedRatings.includes(beer.ratingCategory);
        });
      }
      
      // Search filter: check that every search word appears in a few key fields.
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
      
      // Filter out cards where cost per standard is null or 0.
      available = available.filter(beer => parseFloat(beer.cost_per_standard) > 0);
      
      // Sort by cost per standard drink.
      available.sort((a, b) => {
        let aVal = parseFloat(a.cost_per_standard) || 0;
        let bVal = parseFloat(b.cost_per_standard) || 0;
        return aVal - bVal;
      });
      return available;
    },
    displayedBeers() {
      return this.filteredBeers.slice(0, this.displayLimit);
    }
  },
  methods: {
    // Helper function to map rating numbers to descriptive words.
    // 5 categories for the card text:
    mapRatingText(rating) {
      if (rating == null) return "?";
      const num = parseFloat(rating);
      if (isNaN(num)) return "🤨?";
      if (num < 3.5) return "Undrinkable";
      if (num < 4) return "Just ok";
      if (num < 4.5) return "Good enough";
      if (num <= 4.8) return "Great!";
      return "Legendary";
    },
    // 4 categories for filtering (combine Ok and Good)
    mapRatingCategory(ratingText) {
      // Combine "Just ok" and "Good enough" into "Ok / Good"
      if (ratingText === "Just ok" || ratingText === "Good enough") return "Ok / Good";
      // Otherwise, it’s already Undrinkable, Great!, or Legendary
      return ratingText;
    },
    // Use the provided image URL directly. In case of an error, fall back to a beer icon.
    handleImageError(event) {
      event.target.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='48'>🍺</text></svg>";
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
        this.selectedPackages = [pkg];
      } else if (this.selectedPackages.length === 1 && this.selectedPackages[0] === pkg) {
        this.selectedPackages = [...allPackages];
      } else {
        if (this.selectedPackages.includes(pkg)) {
          this.selectedPackages = this.selectedPackages.filter(p => p !== pkg);
          if (this.selectedPackages.length === 0) {
            this.selectedPackages = [...allPackages];
          }
        } else {
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
    toggleRating(ratingCat) {
      const allRatings = ["Undrinkable", "Ok / Good", "Great!", "Legendary"];
      // If all are selected, clicking one selects only that one
      if (this.selectedRatings.length === allRatings.length) {
        this.selectedRatings = [ratingCat];
      }
      // If only one is active and it's clicked again, reset to all
      else if (this.selectedRatings.length === 1 && this.selectedRatings[0] === ratingCat) {
        this.selectedRatings = [...allRatings];
      }
      // Otherwise, toggle normally
      else {
        if (this.selectedRatings.includes(ratingCat)) {
          this.selectedRatings = this.selectedRatings.filter(r => r !== ratingCat);
          if (this.selectedRatings.length === 0) {
            this.selectedRatings = [...allRatings];
          }
        } else {
          this.selectedRatings.push(ratingCat);
        }
      }
    },
    // strength code
    computeStrengthCategory(percentage) {
      if (percentage < 3) return "Light";
      if (percentage <= 4) return "Mid";
      if (percentage <= 5.5) return "Full";
      return "Extra full";
    },
    computeStrengthEmoji(category) {
      switch (category) {
        case "Light": return "🍺";
        case "Mid": return "🍺🍺";
        case "Full": return "🍺🍺🍺";
        case "Extra full": return "🍺🍺🍺🍺";
        default: return "";
      }
    },
    toggleStrength(strength) {
      const allStrengths = ["Light", "Mid", "Full", "Extra full"];
      // If all are selected, clicking one selects only that one.
      if (this.selectedStrengths.length === allStrengths.length) {
        this.selectedStrengths = [strength];
      }
      // If only one is active and it's clicked again, reset to all.
      else if (this.selectedStrengths.length === 1 && this.selectedStrengths[0] === strength) {
        this.selectedStrengths = [...allStrengths];
      }
      // Otherwise, toggle in/out as normal.
      else {
        if (this.selectedStrengths.includes(strength)) {
          this.selectedStrengths = this.selectedStrengths.filter(s => s !== strength);
          if (this.selectedStrengths.length === 0) {
            this.selectedStrengths = [...allStrengths];
          }
        } else {
          this.selectedStrengths.push(strength);
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
          // Assuming the data is in the new nested format.
          this.beers = Array.isArray(data)
            ? data.filter(item => item && item.properties && item.properties.name)
            : [];
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
    // Updated packagingInfo to work with new fields and check for single packages with unit > 1.
    packagingInfo(beer) {
      const size = beer.size;
      const vessel = beer.vessel ? beer.vessel.toLowerCase() : "bottle";
      if (beer.package === "single") {
        if (beer.package_size > 1) {
          return `${beer.package_size} x ${size}mL ${vessel}`;
        } else {
          return `${size}mL ${vessel}`;
        }
      } else {
        return `${beer.package_size} x ${size}mL ${vessel}`;
      }
    },
    buildShareUrl() {
      const params = new URLSearchParams();
      if (this.searchQuery) {
        params.set("q", this.searchQuery);
      }
      if (this.includeSpecials !== true) {
        params.set("specials", this.includeSpecials);
      }
      const defaultPackages = ["single", "pack", "case"];
      if (this.selectedPackages.slice().sort().join(",") !== defaultPackages.slice().sort().join(",")) {
        params.set("packages", this.selectedPackages.join(","));
      }
      const defaultVessels = ["can", "bottle", "longneck"];
      if (this.selectedVessels.slice().sort().join(",") !== defaultVessels.slice().sort().join(",")) {
        params.set("vessels", this.selectedVessels.join(","));
      }
      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
      return shareUrl;
    },
    copyUrl() {
      const shareUrl = this.buildShareUrl();
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert("URL copied to clipboard:\n" + shareUrl);
      }).catch(err => {
        console.error("Error copying URL: ", err);
      });
    },
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
    this.applyUrlParams();
    this.fetchData();
  }
});
