// Chromatic kick: a screen shader in Hyprland's format (decoration:screen_shader) that also listens when it runs in
// Toaster. The picture's colours part outward from the middle on each kick, under a soft vignette. In Hyprland it
// breathes with the time instead. It's a look in Toaster (U), and the example in docs/looks-from-shaders.md.
#version 300 es
precision mediump float;
in vec2 v_texcoord;
layout(location = 0) out vec4 fragColor;
uniform sampler2D tex;
uniform float time;

void main() {
#ifdef TOASTER
    float kick = uKick; // Toaster's: 1 on the kick, falling away
#else
    float kick = 0.5 + 0.5 * sin(time * 4.0);
#endif
    vec2 d = v_texcoord - 0.5;
    float k = 0.004 + 0.022 * kick;
    vec3 c = vec3(texture(tex, v_texcoord + d * k).r, texture(tex, v_texcoord).g, texture(tex, v_texcoord - d * k).b);
    c *= 1.0 - dot(d, d) * 0.6;
    fragColor = vec4(c, 1.0);
}
