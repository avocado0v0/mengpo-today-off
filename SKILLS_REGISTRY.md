# Skills Registry

Installed project-local under `.agents/skills` for Codex. Validation: each directory contains `SKILL.md`; `npx skills@latest list --agent codex --json` returned every entry as `tracked` for Codex. The installation list confirms discoverability; individual tool workflows have not yet been run.

| Skill | Source | Purpose / appropriate stage | Status and limits |
|---|---|---|---|
| `game-feel` | [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | Interaction feedback, impact, motion polish; prototype and VFX stages | Installed and listed; read its `SKILL.md` before use. |
| `game-ui-ux` | [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | HUD, menus, accessibility and layout; GDD and UI implementation | Installed and listed; read its `SKILL.md` before use. |
| `level-design` | [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | Pacing, player metrics and level layout; GDD and level design | Installed and listed; read its `SKILL.md` before use. |
| `procedural-gen` | [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | Procedural content generation; only if the design needs generated content | Installed and listed; read its `SKILL.md` before use. |
| `shader-programming` | [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | Shader effects; only if the selected visuals need shaders | Installed and listed; read its `SKILL.md` before use. |
| `pixelfx` | [pixelfx](https://github.com/patch-gg/pixelfx) | Pixel-art effects and sprite-sheet export; VFX stage | Installed and listed. CLI assessment flagged high Gen / medium Snyk risk. Manual review found the documented optional Patch CLI install and public publishing flow; neither is needed or authorized here. Rendering requires a pixelfx repository checkout, which has not been cloned. |
| `codeart2d` | [agent-sprite-forge](https://github.com/0x0funky/agent-sprite-forge) | Code-driven 2D asset generation; asset stage | Installed as part of the upstream skill set and listed; inspect its instructions before use. |
| `generate2dmap` | [agent-sprite-forge](https://github.com/0x0funky/agent-sprite-forge) | 2D map generation; level and asset stages | Installed as part of the upstream skill set and listed; inspect its instructions before use. |
| `generate2dmedia` | [agent-sprite-forge](https://github.com/0x0funky/agent-sprite-forge) | Media generation workflow; asset stage | Installed as part of the upstream skill set and listed; inspect its instructions before use. |
| `generate2dsprite` | [agent-sprite-forge](https://github.com/0x0funky/agent-sprite-forge) | 2D sprite generation; asset stage | Installed as part of the upstream skill set and listed; inspect its instructions before use. |
| `video2dsprite` | [agent-sprite-forge](https://github.com/0x0funky/agent-sprite-forge) | Sprite creation from video; only if source video is part of the asset workflow | Installed as part of the upstream skill set and listed; inspect its instructions before use. |
| `setup-matt-pocock-skills` | [mattpocock/skills](https://github.com/mattpocock/skills) | Configure engineering-skill conventions once for a project | Installed and listed; project-specific setup has not yet been run. |
| `grill-with-docs` | [mattpocock/skills](https://github.com/mattpocock/skills) | Requirements interview and domain documentation | Installed and listed; uses `grilling` and `domain-modeling`. |
| `improve-codebase-architecture` | [mattpocock/skills](https://github.com/mattpocock/skills) | Review architecture paths and propose focused improvements | Installed and listed; uses `codebase-design` and `grilling`; apply after there is code to review. |
| `grilling` | [mattpocock/skills](https://github.com/mattpocock/skills) | Guided decision interview used by other skills | Installed and listed as a dependency. |
| `domain-modeling` | [mattpocock/skills](https://github.com/mattpocock/skills) | Maintain the domain model and terminology | Installed and listed as a dependency. |
| `codebase-design` | [mattpocock/skills](https://github.com/mattpocock/skills) | Shared vocabulary for module and interface architecture | Installed and listed as a dependency. |

Environment check: Node `v26.13.0`, npm `11.20.0`, Git `2.56.0.windows.4` are available. The installed skills should be reloaded by reopening the project before use in the Codex UI.
