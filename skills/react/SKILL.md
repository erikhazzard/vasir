---
name: react
description: React component patterns, state ownership, and async effect discipline for production UIs.
---

# React

Use React to express state ownership clearly, not to hide it behind hook soup.

## Core Principle

Keep data close to the component that owns it, derive render output directly from state, and make effects a narrow bridge to the outside world.

## Quick Reference

- Local state first. Reach for shared state only when multiple distant surfaces must coordinate.
- Components own behavior; hooks factor repeated logic, not vague "helper" abstractions.
- Effects synchronize with external systems. They are not a second rendering pipeline.
- Prefer explicit loading, error, and empty states over optimistic ambiguity.

## Implementation Patterns

### Pattern 1: Reducer for state with real transitions

```jsx
import { useReducer } from "react";

function reducer(state, action) {
  switch (action.type) {
    case "rename":
      return { ...state, name: action.name };
    case "save:start":
      return { ...state, saving: true, error: null };
    case "save:done":
      return { ...state, saving: false };
    case "save:error":
      return { ...state, saving: false, error: action.message };
    default:
      return state;
  }
}

export function ProfileForm() {
  const [state, dispatch] = useReducer(reducer, { name: "", saving: false, error: null });
  return (
    <form>
      <input value={state.name} onChange={(event) => dispatch({ type: "rename", name: event.target.value })} />
      <button disabled={state.saving}>Save</button>
      {state.error ? <p role="alert">{state.error}</p> : null}
    </form>
  );
}
```

### Pattern 2: Abortable async effect

```jsx
import { useEffect, useState } from "react";

export function UserPanel({ userId }) {
  const [state, setState] = useState({ status: "loading", user: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", user: null, error: null });

    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((user) => setState({ status: "ready", user, error: null }))
      .catch((error) => {
        if (error.name !== "AbortError") {
          setState({ status: "error", user: null, error: error.message });
        }
      });

    return () => controller.abort();
  }, [userId]);

  if (state.status === "loading") return <p>Loading...</p>;
  if (state.status === "error") return <p role="alert">{state.error}</p>;
  return <h2>{state.user.name}</h2>;
}
```

### Pattern 3: Keep urgent and non-urgent updates separate

```jsx
import { startTransition, useDeferredValue, useState } from "react";

export function SearchBox({ runQuery }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  function handleChange(event) {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    startTransition(() => {
      runQuery(nextQuery);
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      <small>Showing results for {deferredQuery}</small>
    </>
  );
}
```

## Anti-Patterns

- Do not mirror props into local state just to keep "editable copies" unless you are intentionally forking draft state.
- Do not push fast-changing feature state into global context by default. That turns innocent rerenders into whole-tree churn.
- Do not use effects to derive values you could compute during render.

## Checklist

- [ ] State ownership is obvious.
- [ ] Effects talk only to external systems.
- [ ] UI handles loading, empty, and error cases explicitly.
- [ ] Event handlers mutate state through named transitions.
- [ ] Expensive work is isolated from urgent input paths.
