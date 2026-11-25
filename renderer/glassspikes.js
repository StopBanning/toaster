// The glass blob's second shader: the one with the kick's spikes in it (glasshands.js, backlog/glass-ball/DESIGN.md "spikes"). glass.js builds it only the first time
// the hands have the blob (Ctrl+K: the glass blob follows your hands) and draws with it only while there are spikes to draw; every other frame, and
// everyone who never turns the hands on, gets glass.js's own FRAG, which is exactly the shader that shipped before there were hands. If a driver refused
// this one, the blob would stay plain: glass.js's `broken` is not set by it.
import { DROPS } from './glasshands.js';

export const FRAG_SPIKY = `
precision highp float;
uniform sampler2D scene;      // the background
uniform sampler2D words;      // the code over it (premultiplied)
uniform vec2 size;            // the window, in CSS pixels
uniform float dpr;
uniform vec3 drops[${DROPS}];  // x, y, radius (CSS pixels, from the top left); radius 0 = unused
uniform sampler2D lobes;      // the kick's spikes: how far out the middle drop's edge goes at each angle round it, as a fraction of its radius, halved (a byte)
uniform float lobeOn;         // 1 while there are spikes to draw (the hands have the blob and a kick has just landed), else 0: and the blob is then exactly what it was
uniform float thickness;      // how thick the glass is in the middle of a drop, in pixels
uniform float depth;          // how strongly it bends what's under it
uniform vec3 fg;              // the theme's text colour, which the rim reflects
uniform vec3 shine;           // the highlights: the theme's lighter colour
const vec3 LIGHT = vec3(-0.45, -0.65, 0.62); // from the top left (y runs down the screen)
const float EDGE = 0.3679;    // exp(-1): a drop on its own ends at its radius

// What the page shows at a point: the code over the background.
vec3 look(vec2 uv) {
  uv = clamp(uv, 0.0, 1.0);
  vec4 w = texture2D(words, uv);
  return texture2D(scene, uv).rgb * (1.0 - w.a) + w.rgb;
}

// The blob as a field: each drop is a soft hill, and the glass is wherever the hills add up past
// EDGE, so drops that come close grow a bridge and melt together. Returns the field's height and
// its slope.
float lobeAt(float th) { return texture2D(lobes, vec2(th * 0.15915494 + 0.5, 0.5)).r * 2.0; }
vec3 field(vec2 p, bool spiky) {
  float f = 0.0;
  vec2 g = vec2(0.0);
  // the middle drop's radius at this pixel's angle round it, and how it changes with the angle (read before the loop, where every pixel does the same)
  float s0 = 0.0, ds0 = 0.0;
  if (spiky && lobeOn > 0.5) {
    vec2 q0 = p - drops[0].xy;
    float th = atan(q0.y, q0.x);
    s0 = lobeAt(th);
    ds0 = (lobeAt(th + 0.0245) - lobeAt(th - 0.0245)) / 0.049;
  }
  for (int i = 0; i < ${DROPS}; i++) {
    vec3 c = drops[i];
    if (c.z <= 0.0) continue;
    vec2 q = p - c.xy;
    float r = c.z;
    vec2 turn = vec2(0.0);
    if (i == 0 && spiky && lobeOn > 0.5) {
      if (dot(q, q) > 16.0 * c.z * c.z) continue; // (past the longest spike: nothing)
      r = c.z * (1.0 + s0);
      turn = vec2(-q.y, q.x) * (2.0 * c.z * ds0 / (r * r * r)); // the slope the angle adds (times k below)
    }
    float k = exp(-dot(q, q) / (r * r));
    f += k;
    g -= 2.0 * k * q / (r * r);
    g += k * turn;
  }
  return vec3(f, g);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, size.y * dpr - gl_FragCoord.y) / dpr;
  vec3 F = field(p, true);
  float d = (EDGE - F.x) / max(length(F.yz), 1e-4); // about how far outside the rim, in pixels
  float shadow = 0.26 * smoothstep(EDGE * 0.3, EDGE * 1.1, field(p - vec2(10.0, 18.0), false).x);
  if (d > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, shadow); return; }

  // Thickness rises steeply at the rim, like a drop, and keeps curving all the way in.
  float A = thickness / sqrt(1.0 - EDGE), e = max(F.x - EDGE, 0.0);
  float h = A * sqrt(e);
  vec2 slope = F.yz * (0.5 * A / sqrt(max(e, 1e-4)));
  slope *= min(1.0, 6.0 / max(length(slope), 1e-4)); // steep at the very rim, not vertical
  vec3 n = normalize(vec3(-slope, 1.0));

  // Looking straight down through it: the ray bends toward the middle on the way in.
  vec3 t = refract(vec3(0.0, 0.0, -1.0), n, 0.69);
  vec2 shift = t.xy / max(0.25, -t.z) * (h + thickness * 0.3) * depth;
  shift *= min(1.0, thickness * 1.2 / max(length(shift), 1e-4));
  vec2 bend = shift / size;
  vec2 uv = p / size;
  vec3 col = vec3(look(uv + bend * 0.92).r, look(uv + bend).g, look(uv + bend * 1.08).b);

  // Toward the rim it reflects more than it lets through (what's around it, washed with light).
  vec3 L = normalize(LIGHT), V = vec3(0.0, 0.0, 1.0), r = reflect(-V, n);
  float fres = pow(1.0 - n.z, 3.0);
  vec3 env = look(uv - r.xy * 0.22);
  env = mix(env, fg, 0.3 + 0.35 * clamp(-r.y, 0.0, 1.0));
  col = mix(col, env, clamp(fres, 0.0, 0.8));

  // Light: a sharp highlight, a broad sheen from the other side, the lit edge bright and the far
  // edge a little dark (light that never makes it out), and a touch brighter where it's thick.
  vec2 out2 = normalize(n.xy + 1e-6);
  float facing = dot(out2, normalize(L.xy));
  float spec = pow(max(dot(n, normalize(L + V)), 0.0), 90.0);
  float sheen = pow(max(dot(n, normalize(vec3(0.55, 0.6, 0.6) + V)), 0.0), 16.0);
  float lip = 1.0 - smoothstep(0.0, 3.0, -d);
  float inner = 1.0 - smoothstep(2.0, 18.0, -d);
  col *= 1.0 + 0.07 * min(h / thickness, 1.5);
  col *= 1.0 - 0.3 * inner * clamp(-facing, 0.0, 1.0);
  col += shine * (spec * 1.1 + sheen * 0.16 + lip * 0.55 * clamp(facing * 0.8 + 0.4, 0.0, 1.0));
  // thin-film colours toward the rim, like a soap bubble's (AIRGLOW's rims run green, yellow and
  // rainbow), shifting with the glass's thickness and which way the rim faces
  vec3 film = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + h / thickness * 1.6 + facing * 0.3));
  col += film * (lip * 0.3 + clamp(fres, 0.0, 0.8) * 0.22);

  float a = clamp(0.5 - d, 0.0, 1.0);
  gl_FragColor = vec4(min(col, 1.0) * a, a + shadow * (1.0 - a));
}`;
