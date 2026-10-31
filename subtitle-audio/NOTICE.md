# LAME MP3 encoder

This extension bundles LAME 3.100 as the separately replaceable `lame.wasm` library.
LAME is copyright its respective authors and distributed under the GNU Library /
Lesser General Public License, version 2 or later. See `LAME-COPYING.txt`.

- Official project: https://lame.sourceforge.io/
- Exact upstream source: https://downloads.sourceforge.net/project/lame/lame/3.100/lame-3.100.tar.gz
- Source archive SHA-256: `ddfe36cab873794038ae2c1210557ad34857a4b6bdc515785d1da9e175b1da1e`
- Compiler: Emscripten 4.0.15, SDK git tag `389a68bc35dcff7ebae4614e1615099dafda00d1`.
- Build: scalar WebAssembly, `-Oz -flto`, no SIMD, no shared memory, no pthreads.
- Binary SHA-256: `706f9a0209aad1f64255d7d7c26c554b08ab29bc31350df3d3e0777860ff38b3`.

The small project-specific C bridge and reproducible build script are
`tools/subtitle-audio/lame-bridge.c` and `tools/subtitle-audio/build-lame.sh`.
The upstream LAME source is not modified. The bridge restricts output to 24 kHz
mono / 64 kbps so a full Info/LAME metadata frame fits. At 48 kbps upstream LAME
disables this tag; that mode is not offered. Run the build script with Emscripten
loaded to rebuild or replace the WASM library; the JavaScript caller uses its
public exported functions and does not prohibit replacing or debugging a modified
version of the library.

The complete corresponding source is assembled by
`tools/subtitle-audio/package-source.sh` as
`tools/subtitle-audio/lame-corresponding-source.tar.gz` (the upstream archive
above, the bridge, and this notice). That file is not part of the extension
package. It is gzip-compressed, and Microsoft Edge Add-ons rejects an uploaded
package that contains a compressed file. The audio runtime does not load it.

Written offer, valid for at least three years after you receive a copy of this
extension: the publisher will give you that corresponding source, for no charge
beyond the cost of distribution, so you can rebuild or replace `lame.wasm`.
Load Emscripten 4.0.15 and run `bash tools/subtitle-audio/build-lame.sh`.
Request a copy through https://www.youtube-dubbing.com/. The unmodified upstream
archive can also be downloaded from the SourceForge URL above; its SHA-256 must
match the value in this notice.
