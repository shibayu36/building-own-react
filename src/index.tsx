// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Didact = {
  createElement,
  render,
};

type Fiber = {
  type: string;
  props: DidactProps | null;

  dom?: HTMLElement | Text;

  parent?: Fiber;
  sibling?: Fiber;
  child?: Fiber;

  alternate?: Fiber;

  effectTag?: "UPDATE" | "PLACEMENT" | "DELETION";
};
let wipRoot: Fiber | undefined = undefined;
// 最後のファイバーツリーの参照。これと比較し差分処理する
let currentRoot: Fiber | undefined = undefined;
let nextUnitOfWork: Fiber | undefined = undefined;

// ここ独自実装に差し替えられるの面白い
/** @jsx Didact.createElement */
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);
const container = document.getElementById("root");
Didact.render(element, container);

requestIdleCallback(workLoop);

function workLoop(deadline: IdleDeadline): void {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

function performUnitOfWork(fiber: Fiber): Fiber | undefined {
  // add dom node
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // create new fibers
  const elements = fiber.props?.children ?? [];
  reconcileChildren(fiber, elements);

  // return next unit of work
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber: Fiber | undefined = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
  return undefined;
}

// あるfiberの子供のfiberを構築する
function reconcileChildren(wipFiber: Fiber, elements: DidactElement[]) {
  const index = 0;
  let oldFiber = wipFiber.alternate?.child;
  const prevSibling: Fiber | undefined = undefined;

  while (index < elements.length || oldFiber !== undefined) {
    const element = elements[index];
    const newFiber: Fiber | undefined = undefined;

    // TODO compare oldFiber to element
    const sameType = oldFiber && element && oldFiber.type === element.type;

    if (sameType) {
      // TODO ノードの更新
    }
    if (element && !sameType) {
      // TODO ノードの追加
    }
    if (oldFiber && !sameType) {
      // TODO ノードの削除
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }
  }
  // for (const element of elements) {
  //   const newFiber: Fiber = {
  //     type: element.type,
  //     props: element.props,
  //     parent: wipFiber,
  //     dom: undefined,
  //     sibling: undefined,
  //   };

  //   if (prevSibling === undefined) {
  //     // first child element
  //     wipFiber.child = newFiber;
  //   } else {
  //     prevSibling.sibling = newFiber;
  //   }

  //   prevSibling = newFiber;
  // }
}

/**
 * 仮想DOMを反映
 */
function commitRoot(): void {
  commitWork(wipRoot?.child);
  currentRoot = wipRoot;
  wipRoot = undefined;
}

function commitWork(fiber: Fiber | undefined): void {
  if (fiber?.dom === undefined) {
    return;
  }

  const domParent = fiber.parent?.dom;
  if (domParent !== undefined) {
    domParent.appendChild(fiber.dom);
    commitWork(fiber.child);
    commitWork(fiber.sibling);
  }
}

function createElement(type: string, props: DidactProps = { children: [] }, ...children: DidactChild[]): DidactElement {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) => (typeof child === "object" ? child : createTextElement(child))),
    },
  };
}

function createTextElement(text: DidactText): DidactElement {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

type DidactElement = {
  type: string;
  props: DidactProps | null;
};
type DidactText = string | number;
type DidactChild = DidactElement | DidactText;
type DidactProps = {
  children: DidactElement[];
  [key: string]: any;
};

function render(element: DidactElement, container: HTMLElement | null): void {
  if (container === null) return;

  wipRoot = {
    type: "ROOT_ELEMENT",
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  };
  nextUnitOfWork = wipRoot;
}

function createDom(fiber: DidactElement): Text | HTMLElement {
  if (fiber.type === "TEXT_ELEMENT") {
    return document.createTextNode(fiber.props?.nodeValue ?? "");
  } else {
    const dom = document.createElement(fiber.type);
    if (fiber.props !== null) {
      for (const [key, value] of Object.entries(fiber.props)) {
        if (!isAttribute(key)) continue;
        dom.setAttribute(key, value);
      }
    }
    return dom;
  }
}

function isAttribute(propName: string): boolean {
  // jsxをtransformするときに__selfや__sourceを入れてくるので抜いている
  return propName !== "children" && propName !== "__self" && propName !== "__source";
}

export {};
