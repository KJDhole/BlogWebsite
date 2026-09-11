---
name: frontend-motion
description: Use when building or refactoring frontend animation, Three.js scenes, WebGL motion, scene transitions, particle motion, or post-processing effects.
---

# Frontend Motion

## Core rule

Before building animation infrastructure, check the framework's official docs, examples, and addons first. Reuse an official pattern when it already solves the underlying problem; custom code should be limited to project-specific composition and glue.

For Three.js work, read `references/threejs-official-patterns.md` before implementing.

## Required workflow

1. Identify the visual requirement and the framework already in the project.
2. Search official examples/docs for the closest maintained pattern.
3. Record the official reference in the task or PR.
4. Prefer official addons/examples over a custom shader, custom render pass, or custom particle engine.
5. Keep bespoke math only when it expresses project-specific motion that the official primitive does not provide.
6. Preserve reduced-motion, responsive behavior, lifecycle cleanup, context-loss handling, and performance constraints.
7. Verify with automated tests plus real browser/frame review before merge.

## Three.js defaults

- Scene-to-scene mixing: prefer `RenderTransitionPass`.
- Post-processing chain: prefer `EffectComposer` and official passes.
- Transition glow: prefer `UnrealBloomPass` when bloom is actually needed.
- Dynamic particles: prefer `BufferGeometry`, preallocated typed arrays, and `DynamicDrawUsage`.
- Do not create per-frame geometry or replace an official pass with a hand-written equivalent without a documented reason.

## Common mistakes

- Recreating a maintained Three.js example with CSS or a custom shader.
- Letting DOM layout animation and WebGL scene animation both own the same transition.
- Adding a new animation dependency before checking the existing framework.
- Calling a transition finished because tests are green without reviewing actual frames.
