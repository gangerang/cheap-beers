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
    selectedPackages: [],
    includeSpecial: false,
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
      
      // Exclude special pricing if not included.
      if (!this.includeSpecial) {
        result = result.filter(beer => beer.special.toString() === "false");
      }
      
      // Sort by selected field and order.
      if (this.sortBy) {
        result = result.slice().sort((a, b) => {
          let diff = parseFloat(a[this.sortBy]) - parseFloat(b[this.sortBy]);
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
    // Build image URL. If the stock code starts with "EM_", drop that prefix.
    imageUrl(stockcode) {
      let code = stockcode.toString();
      if (code.startsWith("EM_")) {
        code = code.slice(3);
      }
      code = code.replace(/_/g, '-');
      return `https://media.danmurphys.com.au/dmo/product/${code}-1.png`;
    },
    // Build supplier URL based on stockcode.
    supplierUrl(stockcode) {
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
    // Parse CSV using Papa Parse and filter out empty rows.
    parseCSV() {
      Papa.parse(csvUrl, {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          // Filter out any empty rows (rows without a valid name)
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
