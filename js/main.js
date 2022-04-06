//begin script when window loads
window.onload = setMap();


function setMap(){

    //map frame dimensions
    var width = 960,
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
      //console.log(csvData);
      //console.log(canmex);
      //console.log(usa);
      //translate europe TopoJSON
      var canadaMexico = topojson.feature(canmex, canmex.objects.canadamexico),
        usStates = topojson.feature(usa, usa.objects.USstates).features;
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
        //add Europe countries to map
      var countries = map.append("path")
          .datum(canadaMexico)
          .attr("class", "countries")
          .attr("d", path);

      //add France regions to map
      var regions = map.selectAll(".regions")
          .data(usStates)
          .enter()
          .append("path")
          .attr("class", function(d){
              return "regions " + d.properties.adm1_code;
          })
          .attr("d", path);

      //examine the results
      console.log(canadaMexico);
      console.log(usStates);
}



};
