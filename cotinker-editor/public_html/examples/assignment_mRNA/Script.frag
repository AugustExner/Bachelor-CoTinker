// require flocc and flocc-ui
await wpm.requireExternal("https://unpkg.com/flocc@0.5.14/dist/flocc.js");
await wpm.requireExternal("https://unpkg.com/flocc-ui@0.0.9/dist/flocc-ui.js");

const { HEIGHT, SPEED, WIDTH } = await Fragment.one('#constants').require();
const { Nucleotide, makePolymerase, makeInhibitor, isNucleotide, isPolymerase } = await Fragment.one('#agents').require();
const { viz } = await Fragment.one('#viz').require();
const { neighbors } = await Fragment.one('#utils').require();
const { Environment, utils } = flocc;

function makeRNA(polymerase) {
  const { attached, RNA } = polymerase.getData();

  const { type } = attached.getData();
  let lookingFor = null;
  if (type === "A") lookingFor = "U";
  if (type === "C") lookingFor = "G";
  if (type === "G") lookingFor = "C";
  if (type === "T") lookingFor = "A";

  const nucleotides = neighbors(polymerase, 3).filter(
    (n) =&gt; !n.get("belongsTo") &amp;&amp; n.get("type") === lookingFor
  );
  if (nucleotides.length === 0) return;
  const nucleotide = utils.sample(nucleotides);

  if (attached.get("next") === null) {
    // free it
    polymerase.set("attached", null);
    RNA.forEach((a) =&gt; {
      a.set("belongsTo", null);
      a.enqueue(() =&gt; environment.removeAgent(a, false));
    });
    polymerase.set("RNA", []);
    environment.increment("RNAstrings");
  } else {
    polymerase.increment("x");
    polymerase.set("attached", attached.get("next"));
    environment.decrement("free");

    // add the new one to the list
    RNA.unshift(nucleotide);
    nucleotide.set("belongsTo", polymerase);
    nucleotide.set("x", polymerase.get("x"));
    nucleotide.set("y", polymerase.get("y"));

    // update RNA list
    RNA.forEach((a, i) =&gt; {
      a.set({
        x: polymerase.get("x"),
        y: polymerase.get("y") + i,
      });
    });
  }
}

function lookForTAC(polymerase) {
  const nucleotides = neighbors(polymerase, 3).filter(isNucleotide);

  let found = false;
  let T = null;

  for (let i = 0; i &lt; nucleotides.length; i++) {
    const nucleotide = nucleotides[i];
    if (nucleotide.get("belongsTo") !== "template_strand") continue;
    let { next, type } = nucleotide.getData();
    if (type === "T") {
      T = nucleotide;
      if (next &amp;&amp; next.get("type") === "A") {
        next = next.get("next");
        if (next &amp;&amp; next.get("type") === "C") {
          found = true;
          break;
        }
      }
    }
  }

//@start:inhibitor-creation@
  if (found) {
    polymerase.set("attached", T);
    polymerase.set("x", T.get("x"));
    polymerase.set("y", T.get("y"));

    if (environment.get("RNAstrings") &gt;= 5) {
      const inhibitor = makeInhibitor();
      inhibitor.addRule(inhibitorTick);
      environment.addAgent(inhibitor);
    }
  }
//@end:inhibitor-creation@
}

function nucleotideTick(nucleotide) {
  const { belongsTo, x, y, vx, vy } = nucleotide.getData();
  if (belongsTo) return;
  const { speed } = environment.getData();
  return {
    x: x + vx * speed,
    y: y + vy * speed,
  };
}

function polymeraseTick(polymerase) {
  const { belongsTo, x, y, vx, vy } = polymerase.getData();
  const { speed } = environment.getData();

  // if it belongs to an inhibitor,
  // just return the new position
  if (belongsTo) {
    return {
      x: x + vx * speed,
      y: y + vy * speed,
    };
  }

  if (polymerase.get("attached")) {
    makeRNA(polymerase);
  } else {
    lookForTAC(polymerase);
  }

  // Need to reference these values again
  // since they might be async set in `lookForTAC`
  if (polymerase.get("attached")) {
    return {
      x: polymerase.get("x"),
      y: polymerase.get("y"),
    };
  } else {
    return {
      x: x + vx * speed,
      y: y + vy * speed,
    };
  }
}

function inhibitorTick(inhibitor) {
  const { attached, x, y, vx, vy } = inhibitor.getData();
  const { speed } = environment.getData();

  // if it is attached to a polymerase,
  // just return the new position based on the polymerase's position and velocity
  if (attached) {
    return {
      x: attached.get("x") + attached.get("vx") * speed,
      y: attached.get("y") + attached.get("vy") * speed,
    };
  }

  const openPolymerases = neighbors(inhibitor, 2).filter(
    (a) =&gt; isPolymerase(a) &amp;&amp; !a.get("attached") &amp;&amp; !a.get("belongsTo")
  );

  if (openPolymerases.length &gt; 0) {
    const polymerase = utils.sample(openPolymerases);
    inhibitor.set("attached", polymerase);
    polymerase.set({
      belongsTo: inhibitor,
      vx: polymerase.get("vx") * 0.2,
      vy: polymerase.get("vy") * 0.2,
    });
  }

  return {
    x: x + vx * speed,
    y: y + vy * speed,
  };
}

function makeNucleotide(data) {
  const color = (nucleotide) =&gt; {
    const { type } = nucleotide.getData();
    if (type === "A") return "gray";
    if (type === "C") return "gray";
    if (type === "G") return "gray";
    if (type === "T") return "gray";
    if (type === "U") return "gray";
  };
  return new Nucleotide({ color, ...data });
}

function makeDNAStrings() {
  // coding strand
  const TXT = "ATATATCGCATGGGTATTGTGGAACAGTGTTGCACCAGTATTTGTTCTAGGTATCAGTAA";
  TXT.split("").forEach((type, i) =&gt; {
    const nucleotide = makeNucleotide({
      belongsTo: "coding_strand",
      x: i + 0.5,
      y: 0.5,
      type: type,
    });
    environment.addAgent(nucleotide);
  });
  // template strand -- create a linked list
  const templateNucleotides = TXT.split("").map((c, i) =&gt; {
    const template_type = {
      A: "T",
      T: "A",
      C: "G",
      G: "C",
    };
    const type = template_type[c];

    const nucleotide = makeNucleotide({
      belongsTo: "template_strand",
      x: i + 0.5,
      y: 2.5,
      vx: 0,
      vy: 0,
      type: type,
      tick: nucleotideTick,
    });
    return nucleotide;
  });
  templateNucleotides.forEach((nucleotide, i) =&gt; {
    nucleotide.set(
      "next",
      i &lt; templateNucleotides.length - 1 ? templateNucleotides[i + 1] : null
    );
    environment.addAgent(nucleotide);
  });
}

function setup() {
  if (window.environment) window.environment.clear();
  window.environment = new Environment({ width: WIDTH, height: HEIGHT });
  environment.set({
    RNAstrings: 0,
    speed: SPEED,
    paused: true,
  });

  viz();

  makeDNAStrings();

  for (let i = 0; i &lt; 1000; i++) {
    const nucleotide = makeNucleotide();
    nucleotide.addRule(nucleotideTick);
    environment.addAgent(nucleotide);
  }
  environment.set("free", 1000);

  for (let i = 0; i &lt; 10; i++) {
    const polymerase = makePolymerase();
    polymerase.addRule(polymeraseTick);
    environment.addAgent(polymerase);
  }

  const inhibitor = makeInhibitor();
  inhibitor.addRule(inhibitorTick);
  environment.addAgent(inhibitor);

  environment.renderers.forEach((r) =&gt; r.render());
}

setup();
