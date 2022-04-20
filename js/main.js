//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var attrArray = ["Operating_expenditures", "Capital_expenditures", "Acres", "Attendance", "Revenue"]; //list of attributes
var expressed = attrArray[0]; //initial attribute
var colorArray = ["EqualIntervalScale", "NaturalBreaksScale", "QuantileScale"];
var colorexpr = colorArray[0];
//chart frame dimensions
var chartWidth = window.innerWidth * 0.425,
    chartHeight = 473,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//create a scale to size bars proportionally to frame and for axis
var yScale = d3.scaleLinear()
    .range([463, 0])
    .domain([0, 1984]);

//Color classes for any of the
var colorClasses = [
  "#ffffcc",
  "#c2e699",
  "#78c679",
  "#31a354",
  "#006837"
];
//create color scale generator
var colorScale = d3.scaleThreshold()
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


      var colorScale =  changecolorscale(colorexpr,csvData);
      createcolorDropdown(csvData);
      createDropdown(csvData);
      setEnumerationUnits(usStates, map, path,colorScale);
      setChart(csvData, colorScale);

      //examine the results
      console.log(canadaMexico);
      console.log(usStates);
    }
};
function changecolorscale(attribute,data){
  //Color Scale Functions
  //Natural Breaks color scale generator
  if(attribute = "NaturalBreaksScale") {
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
        } else if (attribute = "EqualIntervalScale") {
      //build two-value array of minimum and maximum expressed attribute values
      var minmax = [
       d3.min(data, function(d) { return parseFloat(d[expressed]); }),
        d3.max(data, function(d) { return parseFloat(d[expressed]); })
        ];
        //assign two-value array as scale domain
      colorScale.domain(minmax);
      return colorScale;
    }  //quantile color scale generator
    else if (attribute = "QuantileScal") {
      //build array of all values of the expressed attribute
      var domainArray = [];
      for (var i=0; i<data.length; i++){
          var val = parseFloat(data[i][expressed]);
          domainArray.push(val);
      };

      //assign array of expressed values as scale domain
      colorScale.domain(domainArray);
      return colorScale;
}
  changeAttribute(expressed,csvData);
};
//Function to create a dropdown menu for to change the color scale
function createcolorDropdown(csvData){
    //add select element
    var colordropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown colordoropdown")
        .on("change", function(){
            changecolorscale(this.value, csvData)
        });
        //add initial option
        var titleOption1 = colordropdown.append("option")
            .attr("class", "titleOption colortitleOption")
            .attr("disabled", "true")
            .text("EqualIntervalScale");

        //add attribute name options
        var attrOptions1 = colordropdown.selectAll("attrOptions")
            .data(colorArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
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
        })
        .on("mouseover", function(event, d){
      highlight(d.properties);
    })
    .on("mouseout", function(event, d){
        dehighlight(d.properties);
      })
      .on("mousemove", moveLabel);
      var desc = regions.append("desc")
        .text('{"stroke": "#000", "stroke-width": "0.5px"}');

};


//Function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown attributedropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });
        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
};

//dropdown change event handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;
    var maxArray = [];
    for (var i=0; i<csvData.length; i++){
        var val = parseFloat(csvData[i][expressed]);
        maxArray.push(val);
    };
    console.log(maxArray)
    var maxval= Math.max(...maxArray)
    console.log(maxval)
    yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, maxval]);
    //recreate the color scale
    var colorScale =  changecolorscale(attribute,csvData);
    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = d3.select(".axis")
        .attr("transform", translate)
        .call(yAxis);
    //recolor enumeration units
    var regions = d3.selectAll(".regions")
        .style("fill", function(d){
            var value = d.properties[expressed];
            if(value) {
                return colorScale(value);
            } else {
                return "#ccc";
            }
        });
        var bars = d3.selectAll(".bar")
            //Sort bars
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
              return i * 20
            })
            .duration(500);

        updateChart(bars, csvData.length, colorScale);
    };
    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale){
        //position bars
        bars.attr("x", function(d, i){
                return i * (chartInnerWidth / n) + leftPadding;
            })
            //size/resize bars
            .attr("height", function(d, i){
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function(d){
                var value = d[expressed];
                if(value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
        });
    var chartTitle = d3.select(".chartTitle")
      .text( expressed + " in each State");
    };
//function to create coordinated bar chart
//function to create coordinated bar chart
function setChart(csvData, colorScale){
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
        .on("mouseover", function(event, d){
            highlight(d);
        })
        .on("mouseout", function(event, d){
            dehighlight(d);
        })
        .on("mousemove", moveLabel);
        var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');;

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
  updateChart(bars, csvData.length, colorScale);
};
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.name)
        .style("stroke", "black")
        .style("stroke-width", "2");
    setLabel(props)
};
function dehighlight(props){
    var selected = d3.selectAll("." + props.name)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
    d3.select(".infolabel")
    .remove();
};
//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.name + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.name);
};
function moveLabel(){
  //get width of label
  var labelWidth = d3.select(".infolabel")
      .node()
      .getBoundingClientRect()
      .width;

  //use coordinates of mousemove event to set label coordinates
  var x1 = event.clientX + 10,
      y1 = event.clientY - 75,
      x2 = event.clientX - labelWidth - 10,
      y2 = event.clientY + 25;

  //horizontal label coordinate, testing for overflow
  var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
  //vertical label coordinate, testing for overflow
  var y = event.clientY < 75 ? y2 : y1;

  d3.select(".infolabel")
      .style("left", x + "px")
      .style("top", y + "px");
};
})();
