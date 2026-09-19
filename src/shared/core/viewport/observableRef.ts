/**
 * Ref "observable": se comporta como un RefObject (React le asigna `.current` al montar y
 * `null` al desmontar), pero además avisa cada vez que el elemento cambia.
 *
 * Por qué existe: el hook del viewport vive en un componente (App) que puede montarse
 * ANTES que el contenedor que mide (retornos tempranos: vista pública, Libro, landing).
 * Con un `useRef` común, el efecto corre una vez con `current === null`, no hace nada y
 * nunca se entera de que el contenedor apareció después. Con esto, el hook re-engancha
 * su observador apenas el elemento existe, sin importar en qué orden se monte.
 */
export interface ObservableRef<T> {
  current: T | null;
}

export function createObservableRef<T>(onChange: (value: T | null) => void): ObservableRef<T> {
  let value: T | null = null;
  return {
    get current() {
      return value;
    },
    set current(next: T | null) {
      if (next === value) return;
      value = next;
      onChange(next);
    },
  };
}
