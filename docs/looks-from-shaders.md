# Looks from shaders

A look (U) is a fragment shader run over the picture under the code: the backgrounds, the blocks, the orb, the
camera, gathered into one texture. Toaster runs screen shaders written for
[Hyprland](https://wiki.hypr.land/configuring/variables/#decoration) (its `decoration:screen_shader`) as looks
unchanged, and gives them the song as well.

## Adding one

1. In the app, Ctrl+K and type **looks folder**. It opens the folder Toaster reads looks from (in the settings
   folder).
2. Put a `.frag` or `.glsl` file in it: a Hyprland screen shader, or your own.
3. Ctrl+K **reload looks**, then press U until it comes round. It's named after its file: `custom: <name>`.

A shader that won't compile is skipped, and Toaster says why. It stays out of U's round until it compiles.

## What a shader gets

Hyprland's names work as they are:

| name | what it is |
|---|---|
| `tex` | the picture (a `sampler2D`) |
| `v_texcoord` | where this pixel is in it, 0..1 |
| `fragColor` | what you write (GLSL ES 3.00; any name for the output works); `gl_FragColor` and `texture2D` (GLSL ES 1.00) work too |
| `time` | seconds |

Toaster adds the song. These are declared already, so use them without declaring them:

| name | what it is |
|---|---|
| `uKick`, `uClap`, `uHat`, `uBass` | each part's hit: 1 as it lands, falling away |
| `uBeat`, `uBar` | where the beat and the bar are, 0..1 |
| `uBarN` | which bar |
| `uDrop` | a drop: 1, fading over a second or so |
| `uLocked` | 1 while the beat's found |
| `uBg`, `uFg`, `uAccent` | the theme's colours |
| `uRes`, `uDpr` | the picture's size in pixels, and pixels per CSS pixel |

`TOASTER` is defined, so one file can run in both: `#ifdef TOASTER` around what uses the song (see
`renderer/looks/chroma-kick.frag`, which ships as the look "chroma kick").

Hyprland's pointer uniforms (`pointer_position` and the rest) aren't given: a shader that declares them compiles, and
reads 0.

## Rules of thumb

- A look should be a function of the time and the hits, with no state kept between frames, so a render comes out
  the same as what played.
- Keep it light: it runs on every pixel of every frame, up to about 2.6 million pixels.
