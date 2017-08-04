

/* bubbleChart creation function. Returns a function that will
 * instantiate a new bubble chart given a DOM element to display
 * it in and a dataset to visualize.
 *
 * Organization and style inspired by:
 * https://bost.ocks.org/mike/chart/
 *
 */
function bubbleChart() {
  // Constants for sizing
  var width = 900;
  var height = 320;

  // tooltip for mouseover functionality
  var tooltip = floatingTooltip('OFC_tooltip', 240);


  // These will be set in create_nodes and create_vis
  var svg = null;
  var nodes = [];

  // Nice looking colors - no reason to buck the trend
  var fillColor = d3.scaleOrdinal()
    .domain(['Th5A', 'Th5B', 'Th5C'])
    .range(['#6BC19C', '#CAF185', '#718BBD']);

  var groupsTitleX = {
    "Th5A": width / 4,
    'Th5B': 2*(width / 4),
    'Th5C': 3*(width / 4)
  };
  var groupsData = d3.keys(groupsTitleX);
  
  // Sizes bubbles based on their area instead of raw radius
  // var radiusScale = d3.scale.linear()
  //   .domain([0, 20]).range([10, 200]);

    var radiusScale = d3.scaleLinear()
        // .exponent(0.5)
        .range([0.5, 2]);

  /*
   * This data manipulation function takes the raw data from
   * the CSV file and converts it into an array of node objects.
   * Each node will store data and visualization values to visualize
   * a bubble.
   *
   * rawData is expected to be an array of data objects, read in from
   * one of d3's loading functions like d3.csv.
   *
   * This function returns the new node array, with a node in that
   * array for each element in the rawData input.
   */
  function createNodes(rawData) {
    // Use map() to convert raw data into node data.
    // Checkout http://learnjsdata.com/ for more on
    // working with data.
    // Sizes bubbles based on their area instead of raw radius
  // var radiusScale = d3.scale.linear()
  //   .domain([0, 20]).range([10, 200]);

    var radiusScale = d3.scaleLinear()
        // .exponent(0.5)
        .range([0.1, 2]);
  
    var re = /^([^.]*)/;
    var myNodes = rawData.map(function (d) {
      return {
        id: d.title,
        radius: radiusScale(+d.citations),
        value: d.citations,
        citations: d.citations,
        name: d.creators[0].firstName +', '+d.creators[0].lastName,
        org: d.org,
        key: d.__citekey__,
        url: d.url,
        group: re.exec(d.pages)[0],
        year: d.date,
        x: Math.random() * 900,
        y: Math.random() * 800
      };
    });

    // sort them to prevent occlusion of smaller nodes.
    myNodes.sort(function (a, b) { return b.value - a.value; });

    return myNodes;
  }
function isolate(force, filter) {
  var initialize = force.initialize;
  force.initialize = function() { initialize.call(force, nodes.filter(filter)); };
  return force;
}
  /*
   * Main entry point to the bubble chart. This function is returned
   * by the parent closure. It prepares the rawData for visualization
   * and adds an svg element to the provided selector and starts the
   * visualization creation process.
   *
   * selector is expected to be a DOM element or CSS selector that
   * points to the parent element of the bubble chart. Inside this
   * element, the code will add the SVG continer for the visualization.
   *
   * rawData is expected to be an array of data objects as provided by
   * a d3 loading function like d3.csv.
   */
  var chart = function chart(selector, rawData) {
    // Use the max total_amount in the data as the max in the scale's domain
    // note we have to ensure the total_amount is a number by converting it
    // with `+`.
    var maxAmount = d3.max(rawData, function (d) { return +d.total_amount; });
    radiusScale.domain([0, maxAmount]);

    nodes = createNodes(rawData);

    // Create a SVG element inside the provided selector
    // with desired size.
    svg = d3.select(selector)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    var years = svg.selectAll('.year')
      .data(groupsData);
    years.enter().append('text')
      .attr('class', 'year')
      .attr('x', function (d) { return groupsTitleX[d]; })
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .text(function (d) { return d; });

    var simulation = d3.forceSimulation()
            .force("collide",d3.forceCollide( function(d){return d.radius + 1 }).iterations(50) )
            .force("charge", d3.forceManyBody())
            .force("Th5A", isolate(d3.forceX(width / 4), function(d) { return d.group === "Th5A"; }))
            .force("Th5B", isolate(d3.forceX(2*(width / 4)), function(d) { return d.group === "Th5B"; }))
            .force("Th5C", isolate(d3.forceX(3*(width / 4)), function(d) { return d.group === "Th5C"; }))
            //.force("center", d3.forceCenter(width / 2, height / 2))
            .force("y", d3.forceY(height / 2))
            // .force("y", d3.forceY(0))
            //.force("x", d3.forceX(0))
    
    var node = svg.selectAll("circle")
      .data(nodes, function(d) { return d.id;})
      .enter()
      .append('g').classed('node', true);
    node.append("a")
      .attr("xlink:target", function(d) {return "_top"})
      .attr("xlink:href", function(d) {return d.url})
      .append('circle')
      .classed('bubble', true)
      .attr('r', function(d){  return d.radius })
      .attr('fill', function (d) { return fillColor(d.group); })
      .attr('stroke', function (d) { return d3.rgb(fillColor(d.group)).darker(); })
      .attr('stroke-width', 2)
      .on('mouseover', showDetail)
      .on('mouseout', hideDetail);
    // node.append("title")
    //   .text(function(d) { return '# cites: ' + d.citations.toString() ; });
    node.append("text")
      .attr("dy", 0)
      .attr("dx", -4)
      .attr('fill',"black")
      .text(function(d) { return d.citations; })
      .on('mouseover', showDetail)
      .on('mouseout', hideDetail);
    
    var ticked = function() {
      node.attr("transform", function(d) { return "translate(" + d.x + ", " + d.y + ")"; });
    // node.attr("cx", function(d) { return d.x; })
    //     .attr("cy", function(d) { return d.y; });
    }
    
    simulation.nodes(nodes, function(d) { return d.id;})
              .on("tick", ticked);
  };

  /*
   * Function called on mouseover to display the
   * details of a bubble in the tooltip.
   */
  function showDetail(d) {
    // change outline to indicate hover state.
    d3.select(this).attr('stroke', 'black');

    var content = '<span class="name">Title: </span><span class="value">' +
                  d.id +
                  '</span><br/>' +
                  '<span class="name">Author: </span><span class="value">' +
                  d.name +
                   '</span><br/>' +
                   '<span class="name">Organization: </span><span class="value">' +
                  d.org +
                  '</span><br/>' +
                  '<span class="name">Citations: </span><span class="value">' +
                  d.value +
                  '</span><br/>' +
                  '<span class="name">Group: </span><span class="value">' +
                  d.group +
                  '</span><br/>' +
                  '<span class="name">Year: </span><span class="value">' +
                  d.year +
                  '</span>';
    tooltip.showTooltip(content, d3.event);
    // d3.select("#tooltip").transition()
    //      .duration(200)
    //      .style("opacity", .9);
    d3.select("#tooltip")   
         .style("left", (d3.event.pageX) + "px")         
         .style("top", (d3.event.pageY - 28) + "px");
  };

  /*
   * Hides tooltip
   */
  function hideDetail(d) {
    // reset outline
    d3.select(this)
      .attr('stroke', d3.rgb(fillColor(d.group)).darker());

    tooltip.hideTooltip();
  }
  // return the chart function from closure.
  return chart;
}

/*
 * Below is the initialization code as well as some helper functions
 * to create a new bubble chart instance, load the data, and display it.
 */

var myBubbleChart = bubbleChart();

/*
 * Function called once data is loaded from CSV.
 * Calls bubble chart function to display inside #vis div.
 */
function display(error, data) {
  if (error) {
    console.log(error);
  }
  // console.log(data[0])
  myBubbleChart('#vis', data);
}

// Load the data.
var data = d3.json('data/OFC-2016-Th5.json', display);

