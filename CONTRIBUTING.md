# Contributing to BeatForge

## Conventional Commits

Este proyecto usa [Conventional Commits](https://www.conventionalcommits.org/). El hook `commit-msg` valida el formato automáticamente.

Formato: `<type>(<scope>): <description>`

| Type       | Cuándo usarlo                                |
| ---------- | -------------------------------------------- |
| `feat`     | Nueva funcionalidad                          |
| `fix`      | Corrección de bug                            |
| `chore`    | Mantenimiento, dependencias, configuración   |
| `docs`     | Solo documentación                           |
| `refactor` | Refactorización sin cambio de comportamiento |
| `test`     | Tests                                        |
| `style`    | Formato, puntos y comas (no lógica)          |
| `perf`     | Mejoras de rendimiento                       |
| `ci`       | Cambios en CI/CD                             |
| `revert`   | Revertir un commit anterior                  |

Ejemplos válidos:

```
feat(backend): add JWT authentication middleware
fix(frontend): correct waveform rendering on Safari
chore: update pnpm to 9.15
docs: add API reference for tracks endpoint
```

## Pre-commit hook

Al hacer `git commit`, el hook ejecuta `lint-staged` automáticamente:

- **ESLint** con autofix sobre ficheros `.ts` y `.tsx` staged
- **Prettier** sobre ficheros staged

Si hay errores de lint que no se pueden autofix, el commit se bloquea. Corrige el error y vuelve a hacer commit.

## Comandos útiles

```bash
pnpm lint          # ESLint sobre todo el proyecto
pnpm lint:fix      # ESLint con autofix
pnpm format        # Prettier sobre todo el proyecto
pnpm typecheck     # tsc --noEmit en frontend y backend
```
