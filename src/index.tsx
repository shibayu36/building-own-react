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
};
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
  requestIdleCallback(workLoop);
}

function performUnitOfWork(fiber: Fiber): Fiber | undefined {
  // add dom node
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  if (fiber.parent?.dom !== undefined) {
    fiber.parent.dom.appendChild(fiber.dom);
  }

  // create new fibers
  const elements = fiber.props?.children ?? [];
  let prevSibling: Fiber | undefined = undefined;

  for (const element of elements) {
    const newFiber: Fiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: undefined,
      sibling: undefined,
    };

    if (prevSibling === undefined) {
      // first child element
      fiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
  }

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

  nextUnitOfWork = {
    type: "ROOT_ELEMENT",
    dom: container,
    props: {
      children: [element],
    },
  };
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
