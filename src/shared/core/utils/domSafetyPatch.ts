/**
 * PARCHE DE SEGURIDAD DOM (domSafetyPatch.ts)
 * 
 * Previene excepciones 'NotFoundError: Failed to execute removeChild on Node: The node to be removed is not a child of this node'
 * causadas por extensiones de navegador (traductor automático, plugins de gramática) o reconciliaciones en caliente de React DOM.
 */

if (typeof window !== 'undefined' && typeof Node !== 'undefined') {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child && child.parentNode !== this) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[DOM Safety Patch] Intento de removeChild en un nodo padre desincronizado prevenido:', child, this);
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[DOM Safety Patch] Intento de insertBefore con referenceNode desincronizado prevenido:', referenceNode, this);
      }
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

export {};
