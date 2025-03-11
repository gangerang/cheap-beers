const dataUrl = "https://raw.githubusercontent.com/gangerang/alculator-data/master/beer_corrected.json";

new Vue({
  el: '#app',
  data: {
    beers: [],
    displayLimit: 50  // Initial number of records to show.
  },
  computed: {
    // Sort beers by cost_per_standard ascending (cheapest first)
    filteredBeers() {
      return this.beers.slice().sort((a, b) => {
        let aVal = parseFloat(a.cost_per_standard);
        let bVal = parseFloat(b.cost_per_standard);
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
    // Returns the default image URL using underscores as-is.
    getImageUrl(stockcode) {
      if (!stockcode) return "";
      let code = stockcode.toString();
      if (code.startsWith("ER_")) {
        code = code.slice(3);
      }
      return `https://media.danmurphys.com.au/dmo/product/${code}-1.png`;
    },
    // Returns the alternative image URL with underscores replaced with hyphens.
    getAltImageUrl(stockcode) {
      if (!stockcode) return "";
      let code = stockcode.toString();
      if (code.startsWith("ER_")) {
        code = code.slice(3);
      }
      code = code.replace(/_/g, '-');
      return `https://media.danmurphys.com.au/dmo/product/${code}-1.png`;
    },
    // On image error, switch to the alternative URL.
    handleImageError(event, stockcode) {
      const currentSrc = event.target.src;
      const altSrc = this.getAltImageUrl(stockcode);
      if (currentSrc !== altSrc) {
        event.target.src = altSrc;
      }
    },
    // Constructs the supplier URL based on the stockcode.
    supplierUrl(stockcode) {
      if (!stockcode) return "#";
      return `https://www.danmurphys.com.au/product/${stockcode}`;
    },
    // Increase displayLimit by 50.
    loadMore() {
      this.displayLimit += 50;
    },
    // Fetch the JSON data.
    fetchData() {
      fetch(dataUrl)
        .then(response => response.json())
        .then(data => {
          // Filter out any records that don't have a valid name.
          this.beers = data.filter(item => item.name);
        })
        .catch(error => console.error("Error loading JSON data:", error));
    }
  },
  created() {
    this.fetchData();
  }
});
