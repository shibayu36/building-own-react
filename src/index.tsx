// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Didact = {
  createElement,
  render,
};

const defaultProps: DidactProps = { children: [] };

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
let deletions: Fiber[] = [];

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
  let index = 0;
  let oldFiber = wipFiber.alternate?.child;
  let prevSibling: Fiber | undefined = undefined;

  while (index < elements.length || oldFiber !== undefined) {
    const element = elements[index];
    let newFiber: Fiber | undefined = undefined;

    const sameType = oldFiber && element && oldFiber.type === element.type;

    if (sameType) {
      // ノードの更新
      newFiber = {
        type: element.type,
        props: element.props,
        dom: oldFiber?.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }
    if (element && !sameType) {
      // ノードの追加
      newFiber = {
        type: element.type,
        props: element.props,
        dom: undefined,
        parent: wipFiber,
        alternate: undefined,
        effectTag: "PLACEMENT",
      };
    }
    if (oldFiber && !sameType) {
      // ノードの削除
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (prevSibling === undefined) {
      // first child element
      wipFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
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
  if (domParent === undefined) return;

  if (fiber.effectTag === "PLACEMENT" && fiber.dom !== undefined) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom !== undefined) {
    updateDom(fiber.dom, fiber.alternate?.props ?? defaultProps, fiber.props ?? defaultProps);
  } else if (fiber.effectTag === "DELETION") {
    domParent.removeChild(fiber.dom);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
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
  deletions = [];
}

function createDom(fiber: DidactElement): Text | HTMLElement {
  if (fiber.type === "TEXT_ELEMENT") {
    return document.createTextNode(fiber.props?.nodeValue ?? "");
  } else {
    const dom = document.createElement(fiber.type);
    if (fiber.props !== null) {
      for (const [key, value] of Object.entries(fiber.props)) {
        if (!isProperty(key)) continue;
        dom.setAttribute(key, value);
      }
    }
    return dom;
  }
}

function updateDom(dom: HTMLElement | Text, prevProps: DidactProps, nextProps: DidactProps): void {
  if (dom instanceof Text) {
    dom.nodeValue = nextProps.nodeValue;
  } else {
    // Remove old properties
    Object.keys(prevProps)
      .filter(isProperty)
      .filter(isGone(prevProps, nextProps))
      .forEach((name) => {
        dom.setAttribute(name, "");
      });

    // Set new or changed properties
    Object.keys(nextProps)
      .filter(isProperty)
      .filter(isNew(prevProps, nextProps))
      .forEach((name) => {
        dom.setAttribute(name, nextProps[name]);
      });

    //Remove old or changed event listeners
    Object.keys(prevProps)
      .filter(isEvent)
      .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
      .forEach((name) => {
        const eventType = name.toLowerCase().substring(2);
        dom.removeEventListener(eventType, prevProps[name]);
      });

    // Add event listeners
    Object.keys(nextProps)
      .filter(isEvent)
      .filter(isNew(prevProps, nextProps))
      .forEach((name) => {
        const eventType = name.toLowerCase().substring(2);
        dom.addEventListener(eventType, nextProps[name]);
      });
  }
}

function isProperty(propName: string): boolean {
  // jsxをtransformするときに__selfや__sourceを入れてくるので抜いている
  return (
    propName !== "children" &&
    !isEvent(propName) &&
    // jsxをtransformするときに__selfや__sourceを入れてくるので抜いている
    propName !== "__self" &&
    propName !== "__source"
  );
}

function isEvent(propName: string): boolean {
  return propName.startsWith("on");
}

function isNew(prevProps: DidactProps, nextProps: DidactProps): (propName: string) => boolean {
  return (propName) => prevProps[propName] !== nextProps[propName];
}

function isGone(prevProps: DidactProps, nextProps: DidactProps): (propName: string) => boolean {
  return (propName) => !(propName in nextProps);
}

export {};
