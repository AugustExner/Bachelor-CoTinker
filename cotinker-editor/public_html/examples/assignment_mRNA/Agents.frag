const constants = await Fragment.one('#constants').require();
const { WIDTH, HEIGHT, SCALE } = constants;
const { Agent, Vector, utils } = flocc;

class Nucleotide extends Agent {
  constructor(data) {
    super();
    const v = new Vector(utils.random(-1, 1, true), utils.random(-1, 1, true));
    v.normalize();
    this.set({
      belongsTo: null,
      color: "gray",
      shape: "rect",
      width: SCALE - 1,
      height: SCALE - 1,
      text(a) {
        return a.get("type");
      },
      textColor: "white",
      textSize: SCALE,
      x: utils.random(0, WIDTH, true) + 0.5,
      y: utils.random(0, HEIGHT, true) + 0.5,
      vx: v.x,
      vy: v.y,
      type: utils.sample(["A", "G", "C", "T", "U"]),
      ...data,
    });
  }
}

exports.Nucleotide = Nucleotide;

class Polymerase extends Agent {
  constructor(data) {
    super();
    const v = new Vector(utils.random(-1, 1, true), utils.random(-1, 1, true));
    v.normalize();
    this.set({
      size: SCALE * 1.6,
      color: "rgba(192, 192, 192, 0.5)",
      RNA: [],
      x: utils.random(0, WIDTH, true) + 0.5,
      y: utils.random(0, HEIGHT, true) + 0.5,
      vx: v.x,
      vy: v.y,
      ...data,
    });
  }
}

//@start:inhibitor@
class Inhibitor extends Agent {
  constructor(data) {
    super();
    const v = new Vector(utils.random(-1, 1, true), utils.random(-1, 1, true));
    v.normalize();
    this.set({
      attached: null,
      shape: "triangle",
      color: "rgba(192, 192, 192, 0.5)",
      size: SCALE * 3,
      x: utils.random(0, WIDTH, true) + 0.5,
      y: utils.random(0, HEIGHT, true) + 0.5,
      vx: v.x,
      vy: v.y,
      ...data,
    });
  }
}
//@end:inhibitor@

exports.makeNucleotide = function makeNucleotide(data) {
  return new Nucleotide(data);
}

exports.makePolymerase = function makePolymerase(data) {
  return new Polymerase(data);
}

exports.makeInhibitor = function makeInhibitor(data) {
  return new Inhibitor(data);
}

function is(obj, Proto) {
  return obj instanceof Proto;
}

exports.isNucleotide = function isNucleotide(obj) {
  return is(obj, Nucleotide);
}

exports.isPolymerase = function isPolymerase(obj) {
  return is(obj, Polymerase);
}

exports.isInhibitor = function isInhibitor(obj) {
  return is(obj, Inhibitor);
}

//"Fix" the warning
Agent.prototype.addRule = function (rule) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }

    this.rules.push({
        args: args,
        rule: rule
    });
};