---
name: frontend-motion
description: Use when building or modifying frontend motion, WebGL effects, Three.js scenes, page transitions, particles, post-processing, or animated UI behavior.
---

# Frontend Motion

## Core rule
Use the library before writing the library.

For any motion task, first identify the framework/library already in the project, then check its official docs, examples, and addons for an existing primitive. Reuse the official primitive when it covers the core effect. Write only project-specific glue, timing, styling, or composition around it.

## Required workflow
1. Inspect the existing component/animation stack and stable UI states.
2. Search official documentation and official examples before proposing custom animation code.
3. Record the exact official primitive/example chosen.
4. Prefer existing project components and one animation lifecycle.
5. Only implement custom math/shaders when the official library does not provide the required behavior.
6. Add regression tests for layout stability, reduced motion, overflow, lifecycle cleanup, and the original visual bug.
7. In the PR body, state what came from the official library and what remains project-specific.

## Do not
- Do not recreate an addon, post-processing pass, particle engine, tween system, transition shader, or layout animation already shipped by the project dependency.
- Do not move readable text long distances just to make a transition feel animated.
- Do not add a second WebGL renderer when the existing renderer can host the effect.
- Do not replace stable UI composition unless the task explicitly asks for a redesign.

## Three.js
When Three.js is present, read `references/threejs-official-patterns.md` before implementing scene transitions, bloom, particles, or post-processing.
