const LOAD_COUNT = 48;
const dataUrl = "https://raw.githubusercontent.com/gangerang/alculator-data/master/beer_corrected.json";

new Vue({
  el: '#app',
  data: {
    beers: [],
    searchQuery: "",
    displayLimit: LOAD_COUNT,
    includeSpecials: true,  // Specials are included by default.
    selectedPackages: ["bottle", "pack", "case"]  // All package types selected by default.
  },
  computed: {
    // Filter out invalid items, online_only beers, apply search, and then filter by specials and package.
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
      
      // If no package option is selected, show no beers.
      if (this.selectedPackages.length === 0) {
        available = [];
      } else {
        available = available.filter(beer => {
          let pkg = (beer.package || "").toLowerCase();
          return this.selectedPackages.includes(pkg);
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
      const currentSrc = event.target.src;
      const altSrc = this.getAltImageUrl(stockcode);
      if (currentSrc !== altSrc) {
        event.target.src = altSrc;
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
    }
  },
  created() {
    this.fetchData();
  }
});
