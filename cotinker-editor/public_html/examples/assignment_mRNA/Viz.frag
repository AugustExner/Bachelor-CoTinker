const constants = await Fragment.one('#constants').require();
const { WIDTH, HEIGHT, SCALE } = constants;
const { CanvasRenderer, LineChartRenderer } = flocc;

exports.viz = function viz() {
  window.renderer = new CanvasRenderer(environment, {
    background: "black",
    scale: SCALE,
    width: WIDTH * SCALE,
    height: HEIGHT * SCALE,
  });
  renderer.mount("#container");

  window.RNAstrings = new LineChartRenderer(environment, {
    autoScale: true,
    background: '#fff',
    width: 300,
    height: 200,
    range: {
      min: 0,
      max: 10,
    },
  });
  RNAstrings.mount("#RNAstrings");
  RNAstrings.metric("RNAstrings", {
    fn: () =&gt; environment.get("RNAstrings"),
  });

  window.free = new LineChartRenderer(environment, {
    autoScale: true,
    background: '#fff',
    width: 300,
    height: 200,
  });
  free.mount("#free");
  free.metric("free", {
    fn: () =&gt; environment.get("free"),
  });
}
