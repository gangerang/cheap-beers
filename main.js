const LOAD_COUNT = 48;
const dataUrl = "https://raw.githubusercontent.com/gangerang/alculator-data/master/beer_corrected.json";

new Vue({
  el: '#app',
  data: {
    beers: [],
    searchQuery: "",
    displayLimit: LOAD_COUNT
  },
  computed: {
    // Filter out invalid items, online_only beers, and apply name search.
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
      // Sort by cost_per_standard ascending.
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
    fetchData() {
      fetch(dataUrl)
        .then(response => response.json())
        .then(data => {
          this.beers = Array.isArray(data) ? data.filter(item => item && item.name) : [];
        })
        .catch(error => console.error("Error loading JSON data:", error));
    }
  },
  created() {
    this.fetchData();
  }
});
