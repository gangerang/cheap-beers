const dataRepo = "alculator-data";  // Correct repo name.
const dataBranch = "test";          // Change branch if needed.
const csvUrl = `https://raw.githubusercontent.com/gangerang/${dataRepo}/${dataBranch}/beers.csv`;

new Vue({
  el: '#app',
  data: {
    beers: [],
    searchQuery: '',
    sortBy: 'cost_per_standard', // Default sort field.
    sortOrder: 'asc',            // Default ascending order.
    // For package filtering, store selected packages.
    selectedPackages: [],
    // List of all possible package types.
    packages: ['bottle', 'pack', 'case'],
    displayLimit: 50             // Initial number of records to show.
  },
  computed: {
    filteredBeers() {
      let result = this.beers;
      
      // Filter by search query.
      if (this.searchQuery) {
        const query = this.searchQuery.trim().toLowerCase();
        result = result.filter(beer => beer.name && beer.name.trim().toLowerCase().includes(query));
      }
      
      // Filter by package types if any are selected.
      if (this.selectedPackages.length) {
        result = result.filter(beer => beer.package && this.selectedPackages.includes(beer.package.toLowerCase()));
      }
      
      // All beers are included regardless of special pricing.
      
      // Sort by selected field and order.
      if (this.sortBy) {
        result = result.slice().sort((a, b) => {
          let aVal = parseFloat(a[this.sortBy]);
          let bVal = parseFloat(b[this.sortBy]);
          if (isNaN(aVal)) aVal = 0;
          if (isNaN(bVal)) bVal = 0;
          const diff = aVal - bVal;
          return this.sortOrder === 'asc' ? diff : -diff;
        });
      }
      
      return result;
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
    // Toggle sort order between ascending and descending.
    toggleSortOrder() {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    },
    // Increase displayLimit by 50.
    loadMore() {
      this.displayLimit += 50;
    },
    // Toggle a package type in the selectedPackages array.
    togglePackage(pkg) {
      const index = this.selectedPackages.indexOf(pkg);
      if (index === -1) {
        this.selectedPackages.push(pkg);
      } else {
        this.selectedPackages.splice(index, 1);
      }
    },
    // Parse CSV using Papa Parse and filter out empty rows.
    parseCSV() {
      Papa.parse(csvUrl, {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          this.beers = results.data.filter(item => item.name);
        },
        error: (err) => {
          console.error("Error loading CSV:", err);
        }
      });
    }
  },
  created() {
    this.parseCSV();
  }
});
