// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/tree
function Tree(data, { // data is either tabular (array of objects) or hierarchy (nested objects)
  path, // as an alternative to id and parentId, returns an array identifier, imputing internal nodes
  id = Array.isArray(data) ? d => d.id : null, // if tabular data, given a d in data, returns a unique identifier (string)
  parentId = Array.isArray(data) ? d => d.parentId : null, // if tabular data, given a node d, returns its parent’s identifier
  children, // if hierarchical data, given a d in data, returns its children
  tree = d3.tree, // layout algorithm (typically d3.tree or d3.cluster)
  sort, // how to sort nodes prior to layout (e.g., (a, b) => d3.descending(a.height, b.height))
  label, // given a node d, returns the display name
  title, // given a node d, returns its hover text
  link, // given a node d, its link (if any)
  linkTarget = "_blank", // the target attribute for links (if any)
  width = 640, // outer width, in pixels
  height, // outer height, in pixels
  r = 3, // radius of nodes
  padding = 1, // horizontal padding for first and last column
  fill = "#999", // fill for nodes
  fillOpacity, // fill opacity for nodes
  stroke = "#555", // stroke for links
  strokeWidth = 1.5, // stroke width for links
  strokeOpacity = 0.4, // stroke opacity for links
  strokeLinejoin, // stroke line join for links
  strokeLinecap, // stroke line cap for links
  halo = "#fff", // color of label halo 
  haloWidth = 3, // padding around the labels
  curve = d3.curveBumpX, // curve for the link
  className,
  nodeHeight = 10,
  onClick = ()=>{},
} = {}) {

  // If id and parentId options are specified, or the path option, use d3.stratify
  // to convert tabular data to a hierarchy; otherwise we assume that the data is
  // specified as an object {children} with nested objects (a.k.a. the “flare.json”
  // format), and use d3.hierarchy.
  const root = path != null ? d3.stratify().path(path)(data)
      : id != null || parentId != null ? d3.stratify().id(id).parentId(parentId)(data)
      : d3.hierarchy(data, children);

  // Sort the nodes.
  if (sort != null) root.sort(sort);

  // Compute labels and titles.
  const descendants = root.descendants();
  const L = label == null ? null : descendants.map(d => label(d.data, d));

  // Compute the layout.
  const dx = nodeHeight;
  const dy = width / (root.height + padding);
  tree().nodeSize([dx,dy])(root);

  // Center the tree.
  let x0 = Infinity;
  let x1 = -x0;

  let minTimestamp = Infinity;
  let maxTimestamp = 0;

  let yMax = 0;

  root.each(d => {
    if (d.x > x1) x1 = d.x;
    if (d.x < x0) x0 = d.x;
    if (d.y > yMax) yMax = d.y;
    if (d.data.time && d.data.time < minTimestamp) minTimestamp = d.data.time;
    if (d.data.time && d.data.time > maxTimestamp) maxTimestamp = d.data.time;
  });

let pixelSpan = yMax;

let millisecondsPerPixel = (maxTimestamp - minTimestamp) / pixelSpan;

root.each(d => {
  if(d.data.time) {
    d.y = (d.data.time - minTimestamp) / millisecondsPerPixel;
  }
});

  // Compute the default height.
  if (height === undefined) height = x1 - x0 + dx * 2 + 50;

  // Use the required curve
  if (typeof curve !== "function") throw new Error(`Unsupported curve`);

  const svg = d3.create("svg")
      .attr("viewBox", [-dy * padding / 2, x0 - dx, width, height])
      .attr("width", width)
      .attr("height", height)
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10);

  let zoomer = svg.append("g");

  zoomer.append("g")
      .attr("fill", "none")
      .attr("class", "navigationLine")
      .attr("stroke-opacity", strokeOpacity)
      .attr("stroke-linecap", strokeLinecap)
      .attr("stroke-linejoin", strokeLinejoin)
      .attr("stroke-width", strokeWidth)
    .selectAll("path")
      .data(root.links())
      .join("path")
        .attr("class", (d) => {
          let classAttr = "";
          if(d?.source?.data?.class != null) {
            classAttr += " from-"+d.source.data.class;
          }
          if(d?.target?.data?.class != null) {
            classAttr += " to-"+d.target.data.class;
          }
          return classAttr;
        })
        .attr("d", d3.link(curve)
            .x(d => d.y)
            .y(d => d.x));

  const node = zoomer.append("g")
    .selectAll("a")
    .data(root.descendants())
    .join("a")
      .attr("xlink:href", link == null ? null : d => link(d.data, d))
      .attr("target", link == null ? null : linkTarget)
      .attr("class", className == null ? "navigationStep" : d => "navigationStep "+className(d.data,d))
      .attr("transform", d => `translate(${d.y},${d.x})`)
      .on("click", (evt, d)=>{
        onClick(d.data, d);
      });

  node.append("circle")
      .attr("fill", d => d.children ? stroke : fill)
      .attr("r", r);

  if (title != null) node.append("title")
      .text(d => title(d.data, d));

  if (L) node.append("text")
      .attr("dy", "0.32em")
      .attr("x", 8)
      .attr("y", 0)
      .attr("text-anchor", "start")
      .attr("paint-order", "stroke")
      .text((d, i) => L[i]);

  let scaleDuration = ((yMax+10)*millisecondsPerPixel) / 1000.0;
  let scaler = 5;
  let unit = "s";

  while(Math.floor(scaleDuration / scaler) > 20) {
    scaler += 5;
  }

  const xScale = d3.scaleLinear().range([0, yMax+10]).domain([0, scaleDuration]);
  const xAxis = d3.axisBottom(xScale).ticks(Math.floor(scaleDuration) / scaler, ".0f").tickSizeOuter(0).tickFormat((d,i)=>d+unit);

  zoomer.append("g")
    .attr("transform", "translate(0,"+(x1+50)+")")
    .call(xAxis);

  svg.call(d3.zoom()
      .scaleExtent([1, 2])
      .translateExtent([[-dy, -height / 2.0], [width,height / 2.0]])
      .on("zoom", (evt)=> {
        zoomer.attr("transform", evt.transform);
      })
  );

  return svg.node();
}

window.Tree = Tree;
