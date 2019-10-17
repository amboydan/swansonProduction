'use strict'

const svgWidth = document.getElementById('prodPlot').clientWidth,
	svgHeight = window.innerHeight*0.80;

const dateFormat = d3.timeParse("%m/%d/%Y")
const bisectDate = d3.bisector(function(d){ return d.Date;}).left;

const margin = {top:svgHeight*0.16, right:svgWidth*0.07, bottom:40, left:svgWidth*0.07},
	width = svgWidth-margin.left-margin.right, 
	height = svgHeight-margin.top-margin.bottom;

d3.select("#listSpaceTop")
	.attr("height",margin.top);

//set the scales range
const x = d3.scaleTime()
	.range([0,width]);
const y = d3.scaleLog()
	.range([height,0]);

//setting up the axis
const xAxis = d3.axisBottom()
	.scale(x);

var formatDecimalComma = d3.format(",.1f")
const yAxis = d3.axisLeft()
	.scale(y)
	.tickFormat(function (d) {
                return d > 0.1 ? y.tickFormat(1,d3.format(",d"))(d):
                formatDecimalComma(d);
            });

//Creating a grid 
const xGrid = d3.axisBottom()
	.scale(x)
    .tickSize(-(height))
    .tickFormat("");
const yGrid = d3.axisLeft()
    .scale(y)
    .tickSize(-(width))
    .tickFormat("");

//Boxing the plot
const xTop = d3.axisTop()
	.scale(x)
	.tickSize(0)
	.tickFormat("");
const yRight = d3.axisRight()
	.scale(y)
	.tickSize(0)
	.tickFormat("");

		

const line = d3.line()
        .defined(function(d){return d.Stream > 0; })
        .x(function(d){return x(d.Date);})
        .y(function(d){return y(d.Stream);});

//constructing the chart area.  Anything that comes into the 
//g will be translated by the margins.  Nothing exists in the 
//g as of yet. 
const area = d3.select("#prodPlot")
	.append("svg")
	.attr("width",width + margin.right + margin.left)
	.attr("height",height + margin.top + margin.bottom);

const svg = area
	.append("g")
	.attr("transform",
			"translate(" + margin.left + "," + margin.top + ")");

//create our x & y axis groups to store our axis and not re-create them
//in the update function each time
//tie the x & y axis to prodPlot
const xAxisGroup = svg
	.append('g')
	.attr('class','x-axis')
	.attr('transform','translate(0,' + height +')');

const yAxisGroup = svg
	.append('g')
	.attr('class','y-axis');

//create the grid groups
const xGridGroup = svg
		.append('g')
        .attr('class','x grid')
        .attr('transform','translate(0,' + height +')');

const yGridGroup = svg
	.append('g')
	.attr('class','y grid');

//box in the plot
const xAtTop = svg
	.append('g')
	.attr('class','x top');
const yAtRight = svg
	.append('g')
	.attr('class','y right')
	.attr('transform','translate('+width+',0)');

//tooltip

const tipFace = svg
	.append('rect')
	.attr('height',height)
	.attr('width',width)
	.attr('opacity',0);

const tipLine = svg
	.append('line')
	.attr('class','tip-line')
	.attr('stroke','black');


d3.csv("data/prodPlot.csv").then(function(data){
	//Get all the available Wells.
	const columnWell = data.map(d=>d.Well);
	const allWells = [...new Set(columnWell)]; 
	
	//Populate the well list.
	createWellList('selectWell',allWells);

	//Get wells selected and the update button pushed.
	document.getElementById('changeWell').onclick = update;
	update();
	function update(){
		$('.line').remove();

		let wells = $("#selectWell").val();
		if(wells.length<1){wells = allWells;};
		//working is the data that matches the list of 
		//all wells that have been selected
		const working = [];
		for(let i = 0; i < wells.length; i++){
			working.push(data.filter(d => d.Well == wells[i]));
		}

		//flatten takes a nested array and transforms to a single array
		//this is necessary be cause working is right now nested due to 
		//well list 
		let filltered_Wells = _.flatten(working);
		 
		//Individual streams by date with well names. Nest the objects
		//by the dates
		const streamsbyDate = d3.nest()
			.key(function(d){return dateFormat(d.Date)})
			.entries(filltered_Wells);

		//All streams summed on date. 
		const nested_sumOfStreams = d3.nest()
			.key(function(d){return d.Date})
			.rollup(function(v) { return {
			    Oil: d3.sum(v, function(d) { return d.Oil; }),
			    Gas: d3.sum(v, function(d) { return d.Gas; }),
			    Water: d3.sum(v, function(d) { return d.Water; }),
			    InjGas: d3.sum(v,function(d) { return d.InjGas; }),
			    InjWtr: d3.sum(v,function(d) { return d.InjWtr; }),
			    //WellCount: d3.sum(v,function(d){return d.Oil > 0 ? 1:0})
			  }; })
			.entries(filltered_Wells);

		//Flatten the nest of streams.
		const flat_sumOfStreams = []
		nested_sumOfStreams.forEach(function(stream) {
		  	flat_sumOfStreams.push({//stream.value);
			  	
			  	Date: dateFormat(stream.key),
			  	//WellCount:stream.value.WellCount*30.4,
			  	InjWtr: stream.value.InjWtr,
			  	InjGas: stream.value.InjGas,
			  	Water: stream.value.Water,
			  	Gas: stream.value.Gas,
			    Oil: stream.value.Oil			    
		    });
		  });
		
		//Order the resulting objects by date
		flat_sumOfStreams.sort(function(a,b){
			var dateA = new Date(a.Date),
				dateB = new Date(b.Date);
			return dateA - dateB;
		})

		//Create data arrays for plot.
		const flat_keys = d3.keys(flat_sumOfStreams[0]).filter(function(key){
			return key !== "Date";
		})

		const streams = flat_keys.map(function(name){
			return {
				name: name,
				values: flat_sumOfStreams.map(function(d){
					return {
						Date: d.Date,
						Stream: d[name]>0 ? d[name]/30.4 : NaN
					};
				})
			}
		});
		
		x.domain(d3.extent(flat_sumOfStreams,function(d){return d.Date}));
		y.domain([d3.min(streams,function(c){
			return d3.min(c.values,function(v){
				return v.Stream;
			})}),
			//Add a little bit of room at the top of the max point
			1.1*
			d3.max(streams,function(c){
				return d3.max(c.values,function(v){
					return v.Stream;
				})
			})]);

		//Build Axis
		xAxisGroup.call(xAxis);
		yAxisGroup.call(yAxis);
		//Build Grid
        xGridGroup.call(xGrid);
        yGridGroup.call(yGrid);
        //Build box
        xAtTop.call(xTop);
        yAtRight.call(yRight);
        

		var proj = svg.append('g')
			.attr('class','line')
			.selectAll('.proj')
			.data(streams);

		proj.enter()
			.append('path')
			.attr('class','line')
			.attr('fill','none')
        	.attr('id',function(d,i){return d.name;})
			.attr('d',function(d,i){
				return line(d.values);
			});

		
		tipFace
			//.on('mouseover',tip.show)
			//.on("mouseout",tipHide)
			//.on("mouseover",tipShow)
			.on('mousemove',tipShow);
			
			

		function tipShow(){
			$('.tip-point').remove();
			$('.html-table').remove();
			var x0 = x.invert(d3.mouse(this)[0]),
				y0 = y.invert(d3.mouse(this)[1]),
				i = bisectDate(flat_sumOfStreams,x0,1),
				d0 = flat_sumOfStreams[i-1],
				d1 = flat_sumOfStreams[i],
				circleData = x0 - d0.Date > d1.Date - x0 ? d1 : d0; 

			tipLine
				.attr('hidden',null)
				.attr('y1',height)
				.attr('y2',0)
				.attr('x1',x(x0))
				.attr('x2',x(x0));

			const bubbles = flat_keys.map(function(name){
				return {
					Date:x0,
					Stream: name,
					cx:x(x0),
					Rate:y(circleData[name]/30.4)
					};
				});
			const bubblePoints = bubbles.filter(d => d.Rate !== Infinity);

			const tipPoints = svg
				.append('g')
				.attr('class','tip-point')
				.selectAll('circles')
				.data(bubblePoints)
				.enter()
				.append('circle')
				.attr('class',function(d){return d.Stream;})
				//.attr('fill','none')
				.attr('cx',function(d){return d.cx})
				.attr('cy',function(d){return d.Rate})
				.attr('r',8);

			let filltered_bubbles = _.flatten(bubblePoints);
			
			//console.log(filltered_bubbles);
			var check = tabulate(filltered_bubbles,['Date','Stream','Rate']);
			var htmlTable = svg.append('rect')
				.attr('class','html-table')
				.attr('fill','white')
				.attr('stroke','black')
				.attr('height',(height+margin.top+margin.bottom)*0.15)
				.attr('width',width*0.14)
				.attr('transform','translate('+ (x(x0)-width*0.15/2) +','+ 
					(height+margin.top+margin.bottom)*0.155*-1 + ')');

			tabulate(filltered_bubbles,['Date','Stream','Rate']);
		}

		function tabulate(data, columns) {
			var table = d3.select('.html-table')
				.append('foreignObject');
			var tDate = table.append('thead');
			var thead = table.append('thead');
			var	tbody = table.append('tbody');

			// append the title to the 

			// append the header row
			thead.append('tr')
			  .selectAll('th')
			  .data(columns).enter()
			  .append('th')
			    .text(function (column) { return column; });

			// create a row for each object in the data
			var rows = tbody.selectAll('tr')
			  .data(data)
			  .enter()
			  .append('tr');

			// create a cell in each row for each column
			var cells = rows.selectAll('td')
			  .data(function (row) {
			    return columns.map(function (column) {
			      return {column: column, value: row[column]};
			    });
			  })
			  .enter()
			  .append('td')
			    .text(function (d) { return d.value > 0 ? y.invert(d.value):d.value; });

		  return table;
		  console.log(table);
		}

	}
update;
});

