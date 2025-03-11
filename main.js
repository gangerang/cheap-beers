const LOAD_COUNT = 48;
const dataUrl = "https://raw.githubusercontent.com/gangerang/alculator-data/master/beer_corrected.json";
new Vue({
  el: '#app',
  data: {
    beers: [],
    searchQuery: "",
    displayLimit: LOAD_COUNT,  // Initial number of records to show.
    debugInfo: []  // Array to store debug info
  },
  computed: {
    // First, filter out any invalid items (non-objects, missing name, or online_only true).
    filteredBeers() {
      console.log("Starting filteredBeers computation, searchQuery:", this.searchQuery);
      this.debugInfo.push("Starting filter with " + this.beers.length + " beers");
      
      let available = this.beers.filter(beer => {
        try {
          if (!beer || typeof beer !== "object") {
            console.warn("Skipping invalid beer entry:", beer);
            return false;
          }
          if (!beer.name || typeof beer.name !== 'string') {
            console.warn("Skipping beer without a valid name:", beer);
            return false;
          }
          // Exclude if online_only is truthy.
          if (beer.online_only === true) {
            return false;
          }
          return true;
        } catch (err) {
          console.error("Error in initial beer filter:", err, beer);
          this.debugInfo.push("Error filtering beer: " + JSON.stringify(err));
          return false;
        }
      });
     
      console.log("After initial filter:", available.length);
      this.debugInfo.push("After initial filter: " + available.length + " beers");
      
      // If there's a search query, filter by name (case-insensitive).
      if (this.searchQuery) {
        try {
          console.log("Filtering by search query:", this.searchQuery);
          const query = this.searchQuery.trim().toLowerCase();
          this.debugInfo.push("Search query: '" + query + "'");
          
          available = available.filter(beer => {
            try {
              // Extra defensive checks
              if (!beer) {
                console.warn("Null beer in search filter");
                return false;
              }
              if (!beer.name || typeof beer.name !== 'string') {
                console.warn("Beer with invalid name in search filter:", beer);
                return false;
              }
              
              const beerName = beer.name.toLowerCase();
              const includes = beerName.includes(query);
              return includes;
            } catch (err) {
              console.error("Error filtering beer by name:", err, beer);
              this.debugInfo.push("Error in name filter: " + JSON.stringify(err));
              return false;
            }
          });
          
          console.log("After search filter:", available.length);
          this.debugInfo.push("After search filter: " + available.length + " beers");
        } catch (err) {
          console.error("Error in search filtering process:", err);
          this.debugInfo.push("Search filter error: " + JSON.stringify(err));
        }
      }
     
      // Sort by cost_per_standard ascending. Be defensive about missing values.
      try {
        console.log("Starting sort, available items:", available.length);
        this.debugInfo.push("Starting sort");
        
        // Check for any null items before sorting
        const nullItems = available.filter(item => !item);
        if (nullItems.length > 0) {
          console.warn("Found null items before sorting:", nullItems.length);
          this.debugInfo.push("Warning: Found " + nullItems.length + " null items before sorting");
        }
        
        // First ensure no nulls in the array
        available = available.filter(item => item !== null && item !== undefined);
        
        const result = available.slice().sort((a, b) => {
          try {
            // Extra defensive checks
            if (!a || !b) {
              console.warn("Null item in sort function:", a, b);
              return 0;
            }
            
            // Ensure cost_per_standard exists
            let aVal = (a.cost_per_standard !== undefined && a.cost_per_standard !== null) 
                       ? parseFloat(a.cost_per_standard) : 0;
            let bVal = (b.cost_per_standard !== undefined && b.cost_per_standard !== null) 
                       ? parseFloat(b.cost_per_standard) : 0;
                       
            if (isNaN(aVal)) {
              console.warn("Invalid cost_per_standard for item:", a);
              aVal = 0;
            }
            if (isNaN(bVal)) {
              console.warn("Invalid cost_per_standard for item:", b);
              bVal = 0;
            }
            
            return aVal - bVal;
          } catch (err) {
            console.error("Error in sort function:", err, a, b);
            this.debugInfo.push("Sort error: " + JSON.stringify(err));
            return 0;
          }
        });
        
        console.log("Sort complete, result items:", result.length);
        this.debugInfo.push("Sort complete: " + result.length + " beers");
        return result;
      } catch (err) {
        console.error("Error in sorting process:", err);
        this.debugInfo.push("Sorting process error: " + JSON.stringify(err));
        return [];  // Return empty array on error
      }
    },
    displayedBeers() {
      try {
        console.log("Computing displayedBeers");
        if (!this.filteredBeers) {
          console.warn("filteredBeers is undefined");
          this.debugInfo.push("Warning: filteredBeers is undefined");
          return [];
        }
        
        const result = this.filteredBeers.slice(0, this.displayLimit);
        console.log("displayedBeers count:", result.length);
        return result;
      } catch (err) {
        console.error("Error in displayedBeers:", err);
        this.debugInfo.push("displayedBeers error: " + JSON.stringify(err));
        return [];  // Return empty array on error
      }
    }
  },
  methods: {
    // Returns the default image URL using underscores as-is.
    getImageUrl(stockcode) {
      try {
        if (!stockcode) return "";
        let code = stockcode.toString();
        if (code.startsWith("ER_")) {
          code = code.slice(3);
        }
        return `https://media.danmurphys.com.au/dmo/product/${code}-1.png`;
      } catch (err) {
        console.error("Error in getImageUrl:", err);
        return "";
      }
    },
    // Returns the alternative image URL with underscores replaced with hyphens.
    getAltImageUrl(stockcode) {
      try {
        if (!stockcode) return "";
        let code = stockcode.toString();
        if (code.startsWith("ER_")) {
          code = code.slice(3);
        }
        code = code.replace(/_/g, '-');
        return `https://media.danmurphys.com.au/dmo/product/${code}-1.png`;
      } catch (err) {
        console.error("Error in getAltImageUrl:", err);
        return "";
      }
    },
    // On image error, switch to the alternative URL.
    handleImageError(event, stockcode) {
      try {
        if (!event || !event.target) {
          console.warn("Invalid event in handleImageError");
          return;
        }
        
        const currentSrc = event.target.src;
        const altSrc = this.getAltImageUrl(stockcode);
        
        if (!altSrc) {
          console.warn("Empty altSrc in handleImageError");
          return;
        }
        
        if (currentSrc !== altSrc) {
          event.target.src = altSrc;
        }
      } catch (err) {
        console.error("Error in handleImageError:", err);
      }
    },
    // Constructs the supplier URL based on the stockcode.
    supplierUrl(stockcode) {
      try {
        if (!stockcode) return "#";
        return `https://www.danmurphys.com.au/product/${stockcode}`;
      } catch (err) {
        console.error("Error in supplierUrl:", err);
        return "#";
      }
    },
    // Increase displayLimit by LOAD_COUNT.
    loadMore() {
      try {
        console.log("Loading more, current limit:", this.displayLimit);
        this.debugInfo.push("Load more clicked: current limit " + this.displayLimit);
        this.displayLimit += LOAD_COUNT;
        console.log("New display limit:", this.displayLimit);
        this.debugInfo.push("New limit: " + this.displayLimit);
      } catch (err) {
        console.error("Error in loadMore:", err);
        this.debugInfo.push("Load more error: " + JSON.stringify(err));
      }
    },
    // Clear search query
    clearSearch() {
      try {
        console.log("Clearing search");
        this.debugInfo.push("Clearing search: '" + this.searchQuery + "'");
        this.searchQuery = "";
      } catch (err) {
        console.error("Error in clearSearch:", err);
        this.debugInfo.push("Clear search error: " + JSON.stringify(err));
      }
    },
    // Fetch the JSON data from GitHub.
    fetchData() {
      console.log("Starting data fetch");
      this.debugInfo.push("Starting data fetch");
      
      fetch(dataUrl)
        .then(response => {
          console.log("Fetch response received");
          this.debugInfo.push("Fetch response received");
          return response.json();
        })
        .then(data => {
          console.log("Raw data received, items:", data.length);
          this.debugInfo.push("Raw data received: " + data.length + " items");
          
          // Extra validation before assignment
          if (!Array.isArray(data)) {
            console.error("Data is not an array:", data);
            this.debugInfo.push("Error: Data is not an array");
            this.beers = [];
            return;
          }
          
          // Ensure each entry is an object and has a valid name.
          this.beers = data.filter(item => {
            try {
              if (!item || typeof item !== "object") {
                return false;
              }
              if (!item.name || typeof item.name !== 'string') {
                return false;
              }
              return true;
            } catch (err) {
              console.error("Error filtering initial data:", err);
              this.debugInfo.push("Data filter error: " + JSON.stringify(err));
              return false;
            }
          });
          
          console.log("Loaded beers count:", this.beers.length);
          this.debugInfo.push("Loaded beers: " + this.beers.length);
        })
        .catch(error => {
          console.error("Error loading JSON data:", error);
          this.debugInfo.push("Fetch error: " + JSON.stringify(error));
        });
    },
    // Debug helper
    showDebugInfo() {
      console.log("Debug info:", this.debugInfo);
      alert("Check console for debug information");
    }
  },
  // Error handling at component level
  errorCaptured(err, vm, info) {
    console.error("Vue error captured:", err, info);
    this.debugInfo.push("Vue error: " + info + " - " + err.message);
    // Don't prevent the error from propagating
    return false;
  },
  // Lifecycle hooks for debugging
  beforeCreate() {
    console.log("Vue beforeCreate hook");
  },
  created() {
    console.log("Vue created hook");
    console.log("Starting fetchData");
    this.fetchData();
  },
  beforeMount() {
    console.log("Vue beforeMount hook");
  },
  mounted() {
    console.log("Vue mounted hook");
  },
  beforeUpdate() {
    console.log("Vue beforeUpdate hook");
  },
  updated() {
    console.log("Vue updated hook");
  }
});