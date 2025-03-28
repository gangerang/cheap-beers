const LOAD_COUNT = 48;
const dataUrl = "https://raw.githubusercontent.com/gangerang/cheap-beers-data/master/datasets_cleaned/beer.json";

// Define all defaults in one place
const DEFAULTS = {
  PACKAGES: ["single", "pack", "case"],
  VESSELS: ["can", "bottle", "longneck"],
  STRENGTHS: ["Light", "Mid", "Full", "Strong"],
  RATINGS: ["Undrinkable", "Ok", "Great", "Legendary"]
};

new Vue({
  el: '#app',
  data: {
    beers: [],
    searchQuery: "",
    displayLimit: LOAD_COUNT,
    includeSpecials: true,
    selectedPackages: [...DEFAULTS.PACKAGES],
    selectedVessels: [...DEFAULTS.VESSELS],
    selectedStrengths: [...DEFAULTS.STRENGTHS],
    selectedRatings: [...DEFAULTS.RATINGS],
    showInfo: false,
    showToast: false,
    showFilters: false,  // Add this line
    loadMoreObserver: null,  // Add this line
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
              rating: beer.properties.rating,
              ratingText,
              ratingCategory,
              beer_style: beer.properties.beer_style,
              ibu: beer.properties.ibu,
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
      
      // Search filter: check if any search terms match (OR logic)
      if (this.searchQuery) {
        const searchTerms = this.searchQuery
          .split(/[,;|]/)                    // Split by , ; or |
          .map(term => term.trim())      // Trim whitespace
          .filter(term => term.length)   // Remove empty terms
          .map(term => term.toLowerCase());  // Convert to lowercase

        available = available.filter(beer => {
          const searchable = [
            beer.name || '',                    // Full name
            beer.name_clean || '',              // Clean name without size
            beer.brand || '',                   // Brand name
            beer.vessel || '',                  // Vessel type
            beer.package || '',                 // Package type
            beer.size ? beer.size.toString() : '',  // Size in mL
            beer.package_size ? beer.package_size.toString() : '',  // Units per package
            beer.beer_style || ''               // Beer style (XPA, etc)
          ].join(' ').toLowerCase();

          // Match if ANY of the search terms are found (OR logic)
          return searchTerms.some(term => {
            const words = term.split(/\s+/);  // Split term into words
            return words.every(word => searchable.includes(word));  // All words in term must match
          });
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
      if (num <= 4.8) return "Great";
      return "Legendary";
    },
    // 4 categories for filtering (combine Ok and Good)
    mapRatingCategory(ratingText) {
      // Combine "Just ok" and "Good enough" into "Ok"
      if (ratingText === "Just ok" || ratingText === "Good enough") return "Ok";
      // Otherwise, it’s already Undrinkable, Great, or Legendary
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

    // Generic toggle function that handles all filter types
    // behavour is all selected by default
    // when clicking 1, select only that
    // then clicking others adds them in
    // clicking a single 1 again will default back to all selected
    toggleFilter(item, selectedArray, defaultArray) {
      if (selectedArray.length === defaultArray.length) {
        return [item];
      } else if (selectedArray.length === 1 && selectedArray[0] === item) {
        return [...defaultArray];
      } else {
        if (selectedArray.includes(item)) {
          const filtered = selectedArray.filter(i => i !== item);
          return filtered.length === 0 ? [...defaultArray] : filtered;
        } else {
          return [...selectedArray, item];
        }
      }
    },
    // strength code
    computeStrengthCategory(percentage) {
      if (percentage < 3) return "Light";
      if (percentage <= 4) return "Mid";
      if (percentage <= 5.5) return "Full";
      return "Strong";
    },
    computeStrengthEmoji(category) {
      switch (category) {
        case "Light": return "🍺";
        case "Mid": return "🍺🍺";
        case "Full": return "🍺🍺🍺";
        case "Strong": return "🍺🍺🍺🍺";
        default: return "";
      }
    },
    // toggle functions for each filter type
    togglePackage(pkg) {
      this.selectedPackages = this.toggleFilter(pkg, this.selectedPackages, DEFAULTS.PACKAGES);
    },
    toggleVessel(vessel) {
      this.selectedVessels = this.toggleFilter(vessel, this.selectedVessels, DEFAULTS.VESSELS);
    },
    toggleRating(rating) {
      this.selectedRatings = this.toggleFilter(rating, this.selectedRatings, DEFAULTS.RATINGS);
    },
    toggleStrength(strength) {
      this.selectedStrengths = this.toggleFilter(strength, this.selectedStrengths, DEFAULTS.STRENGTHS);
    },  
    resetFilters() {
      this.searchQuery = "";
      this.includeSpecials = true;
      this.selectedPackages = [...DEFAULTS.PACKAGES];
      this.selectedVessels = [...DEFAULTS.VESSELS];
      this.selectedStrengths = [...DEFAULTS.STRENGTHS];
      this.selectedRatings = [...DEFAULTS.RATINGS];
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
      
      // Search query
      if (this.searchQuery) {
        params.set("q", this.searchQuery);
      }
      
      // Specials filter
      if (this.includeSpecials !== true) {
        params.set("specials", this.includeSpecials);
      }
      
      // Package filters
      if (this.selectedPackages.slice().sort().join(",") !== DEFAULTS.PACKAGES.slice().sort().join(",")) {
        params.set("packages", this.selectedPackages.join(","));
      }
      
      // Vessel filters
      if (this.selectedVessels.slice().sort().join(",") !== DEFAULTS.VESSELS.slice().sort().join(",")) {
        params.set("vessels", this.selectedVessels.join(","));
      }
      
      // Strength filters
      if (this.selectedStrengths.slice().sort().join(",") !== DEFAULTS.STRENGTHS.slice().sort().join(",")) {
        params.set("strengths", this.selectedStrengths.join(","));
      }
      
      // Rating filters
      if (this.selectedRatings.slice().sort().join(",") !== DEFAULTS.RATINGS.slice().sort().join(",")) {
        params.set("ratings", this.selectedRatings.join(","));
      }
      
      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
      return shareUrl;
    },
    copyUrl() {
      const shareUrl = this.buildShareUrl();
      navigator.clipboard.writeText(shareUrl).then(() => {
        this.showToast = true;
        setTimeout(() => {
          this.showToast = false;
        }, 2000);
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
      if (params.has("strengths")) {
        this.selectedStrengths = params.get("strengths").split(",");
      }
      if (params.has("ratings")) {
        this.selectedRatings = params.get("ratings").split(",");
      }
    },
    toggleInfo() {
      this.showInfo = !this.showInfo;
    },
    toggleFilters() {
      this.showFilters = !this.showFilters;
    },
    setupInfiniteScroll() {
      // Create observer for infinite scrolling
      this.loadMoreObserver = new IntersectionObserver(entries => {
        const target = entries[0];
        if (target.isIntersecting && this.displayedBeers.length < this.filteredBeers.length) {
          this.loadMore();
        }
      }, {
        root: null,
        rootMargin: '100px',  // Start loading when within 100px of the bottom
        threshold: 0.1
      });
    }
  },
  created() {
    this.applyUrlParams();
    this.fetchData();
  },
  mounted() {
    this.setupInfiniteScroll();
  },
  updated() {
    // Update the observer target when the DOM changes
    this.$nextTick(() => {
      const loadMoreButton = document.querySelector('.btn-load-more');
      if (loadMoreButton) {
        this.loadMoreObserver.observe(loadMoreButton);
      }
    });
  },
  beforeDestroy() {
    // Clean up the observer
    if (this.loadMoreObserver) {
      this.loadMoreObserver.disconnect();
    }
  }
});
