const LOAD_COUNT = 48;
const dataUrl = "https://raw.githubusercontent.com/gangerang/alculator-data/master/beer_corrected.json";

new Vue({
  el: '#app',
  data: {
    beers: [],
    searchQuery: "",
    displayLimit: LOAD_COUNT,
    includeSpecials: true,            // Specials are included by default.
    selectedPackages: ["single", "pack", "case"],  // All package types selected by default.
    selectedVessels: ["can", "bottle", "longneck"]   // All vessel types selected by default.
  },
  computed: {
    filteredBeers: function() {
      console.log("includeSpecials:", this.includeSpecials);
      var available = this.beers.filter(function(beer) {
        return beer && typeof beer === "object" &&
               beer.name && typeof beer.name === "string" &&
               beer.online_only !== true;
      });
      
      if (this.searchQuery) {
        var query = this.searchQuery.trim().toLowerCase();
        available = available.filter(function(beer) {
          return beer.name.toLowerCase().indexOf(query) !== -1;
        });
      }
      
      if (!this.includeSpecials) {
        available = available.filter(function(beer) {
          return beer.special === false;
        });
      }
      
      if (this.selectedPackages.length === 0) {
        available = [];
      } else {
        available = available.filter(function(beer) {
          var pkg = (beer.package || "").toLowerCase();
          return this.selectedPackages.indexOf(pkg) !== -1;
        }.bind(this));
      }
      
      if (this.selectedVessels.length === 0) {
        available = [];
      } else {
        available = available.filter(function(beer) {
          var vessel = (beer.vessel || "bottle").toLowerCase();
          return this.selectedVessels.indexOf(vessel) !== -1;
        }.bind(this));
      }
      
      return available.slice().sort(function(a, b) {
        var aVal = (a.cost_per_standard != null) ? parseFloat(a.cost_per_standard) : 0;
        var bVal = (b.cost_per_standard != null) ? parseFloat(b.cost_per_standard) : 0;
        if (isNaN(aVal)) aVal = 0;
        if (isNaN(bVal)) bVal = 0;
        return aVal - bVal;
      });
    },
    displayedBeers: function() {
      return this.filteredBeers.slice(0, this.displayLimit);
    }
  },
  methods: {
    getImageUrl: function(stockcode) {
      if (!stockcode) return "";
      var code = stockcode.toString();
      if (code.indexOf("ER_") === 0) {
        code = code.slice(3);
      }
      return "https://media.danmurphys.com.au/dmo/product/" + code + "-1.png";
    },
    getAltImageUrl: function(stockcode) {
      if (!stockcode) return "";
      var code = stockcode.toString();
      if (code.indexOf("ER_") === 0) {
        code = code.slice(3);
      }
      code = code.replace(/_/g, '-');
      return "https://media.danmurphys.com.au/dmo/product/" + code + "-1.png";
    },
    handleImageError: function(event, stockcode) {
      var altSrc = this.getAltImageUrl(stockcode);
      if (event.target.src !== altSrc) {
        event.target.src = altSrc;
      } else {
        event.target.src = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2248%22>🍺</text></svg>";
      }
    },
    supplierUrl: function(stockcode) {
      if (!stockcode) return "#";
      return "https://www.danmurphys.com.au/product/" + stockcode;
    },
    loadMore: function() {
      this.displayLimit += LOAD_COUNT;
    },
    toggleSpecials: function() {
      this.includeSpecials = !this.includeSpecials;
    },
    togglePackage: function(pkg) {
      var index = this.selectedPackages.indexOf(pkg);
      if (index === -1) {
        this.selectedPackages.push(pkg);
      } else {
        this.selectedPackages.splice(index, 1);
      }
    },
    toggleVessel: function(vessel) {
      var index = this.selectedVessels.indexOf(vessel);
      if (index === -1) {
        this.selectedVessels.push(vessel);
      } else {
        this.selectedVessels.splice(index, 1);
      }
    },
    resetFilters: function() {
      this.searchQuery = "";
      this.includeSpecials = true;
      this.selectedPackages = ["single", "pack", "case"];
      this.selectedVessels = ["can", "bottle", "longneck"];
    },
    fetchData: function() {
      var self = this;
      fetch(dataUrl)
        .then(function(response) { return response.json(); })
        .then(function(data) {
          self.beers = Array.isArray(data) ? data.filter(function(item) {
            return item && item.name;
          }) : [];
        })
        .catch(function(error) {
          console.error("Error loading JSON data:", error);
        });
    },
    clearSearch: function() {
      this.searchQuery = "";
    },
    formatPrice: function(value) {
      var num = parseFloat(value);
      if (isNaN(num)) return "N/A";
      if (num === Math.floor(num)) {
        return num.toString();
      }
      return num.toFixed(2);
    },
    packagingInfo: function(beer) {
      var size = beer.size;
      var vessel = beer.vessel ? beer.vessel.toLowerCase() : "bottle";
      var pkg = (beer.package || "").toLowerCase();
      if (pkg === "single") {
        return size + "mL " + vessel;
      } else {
        return beer.package_size + " x " + size + "mL " + vessel;
      }
    }
  },
  created: function() {
    this.fetchData();
  }
});
