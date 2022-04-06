//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var attrArray = ["Operating_expenditures", "Capital_expenditures", "Acres", "Attendance", "Revenue"]; //list of attributes
var expressed = attrArray[0]; //initial attribute
//Color classes for any of the
var colorClasses = [
  "#ffffcc",
  "#c2e699",
  "#78c679",
  "#31a354",
  "#006837"
];
//create color scale generator
var colorScale = d3.scaleQuantile()
    .range(colorClasses);

//begin script when window loads
window.onload = setMap();


function setMap(){

    //map frame dimensions
    var width = window.innerWidth * 0.5,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
      .center([1.82, 37.24])
      .rotate([101.00, 0, 0])
      .parallels([23.82, 49.53])
      .scale(850)
      .translate([width / 2, height / 2]);
    var path = d3.geoPath()
      .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/D3Parksdata.csv")); //load attributes from csv
    promises.push(d3.json("data/canadamexico.topojson")); //load background spatial data
    promises.push(d3.json("data/USstates.topojson")); //load choropleth spatial data
    Promise.all(promises).then(callback);

    function callback(data){
      csvData = data[0];
      canmex = data[1];
      usa = data[2];
      console.log(csvData);
      //console.log(canmex);
      //console.log(usa);
      setGraticule(map, path);
      //translate europe TopoJSON
      var canadaMexico = topojson.feature(canmex, canmex.objects.canadamexico),
        usStates = topojson.feature(usa, usa.objects.USstates).features;
        //add Europe countries to map
      var countries = map.append("path")
          .datum(canadaMexico)
          .attr("class", "countries")
          .attr("d", path);

      usStates = joinData(usStates, csvData);

      var colorScale = makeQuanColorScale(csvData);

      setEnumerationUnits(usStates, map, path,colorScale);

      setChart(csvData, colorScale);

      //examine the results
      console.log(canadaMexico);
      console.log(usStates);
    }
};

function setGraticule(map, path){
  //create graticule generator
  var graticule = d3.geoGraticule()
    .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude
    //create graticule background
  var gratBackground = map.append("path")
    .datum(graticule.outline()) //bind graticule background
    .attr("class", "gratBackground") //assign class for styling
    .attr("d", path) //project graticule
  var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
    .data(graticule.lines()) //bind graticule lines to each element to be created
    .enter() //create an element for each datum
    .append("path") //append each element to the svg as a path element
    .attr("class", "gratLines") //assign class for styling
    .attr("d", path); //project graticule lines
};
function joinData(usStates, csvData){
  //loop through csv to assign each set of csv attribute values to geojson region
  for (var i=0; i<csvData.length; i++){
    var csvRegion = csvData[i]; //the current region
    var csvKey = csvRegion.State; //the CSV primary key

    //loop through geojson regions to find correct region
    for (var a=0; a<usStates.length; a++){

      var geojsonProps = usStates[a].properties; //the current region geojson properties
      var geojsonKey = geojsonProps.name; //the geojson primary key

      //where primary keys match, transfer csv data to geojson properties object
      if (geojsonKey == csvKey){

          //assign all attributes and values
          attrArray.forEach(function(attr){
              var val = parseFloat(csvRegion[attr]); //get csv attribute value
              geojsonProps[attr] = val; //assign attribute and value to geojson properties
          });
      };
    };
  };
    return usStates;
};
function setEnumerationUnits(usStates, map, path, colorScale){
  var regions = map.selectAll(".regions")
      .data(usStates)
      .enter()
      .append("path")
      .attr("class", function(d){
          return "regions " + d.properties.name;
      })
      .attr("d", path)
      .style("fill", function(d){
          var value = d.properties[expressed];
          if(value) {
              return colorScale(d.properties[expressed]);
          } else {
              return "#ccc";
          }
  });
};

//Color Scale Functions
//Natural Breaks color scale generator
function makeNBColorScale(data){


        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };

        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 5);
        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        //remove first value from domain array to create class breakpoints
        domainArray.shift();

        //assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);

        return colorScale;
      };
//equal interval color scale generator
function makeEIColorScale(data){

    //build two-value array of minimum and maximum expressed attribute values
    var minmax = [
     d3.min(data, function(d) { return parseFloat(d[expressed]); }),
      d3.max(data, function(d) { return parseFloat(d[expressed]); })
      ];
      //assign two-value array as scale domain
    colorScale.domain(minmax);

    return colorScale;
  };
//quantile color scale generator
function makeQuanColorScale(data){

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);

    return colorScale;
};

//function to create coordinated bar chart
//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 1984]);

    //set bars for each province
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.State;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return colorScale(d[expressed]);
        });

    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text( expressed + " in each State");

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
};
})();
