// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Didact = {
  createElement,
  render,
};

let nextUnitOfWork: any = null;

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

function performUnitOfWork(fiber: any): any {
  console.log(fiber.type);

  // add dom node
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom);
  }

  // create new fibers
  const elements = fiber.props.children;
  let index = 0;
  let prevSibling = null;

  while (index < elements.length) {
    const element = elements[index];

    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null,
      sibling: null as any,
    };

    if (index === 0) {
      fiber.child = newFiber;
    } else {
      prevSibling!.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }

  // return next unit of work
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
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

  nextUnitOfWork = {
    dom: container,
    props: {
      children: [element],
    },
  };

  // if (element.type === "TEXT_ELEMENT") {
  //   const dom = document.createTextNode(element.props?.nodeValue ?? "");
  //   container.appendChild(dom);
  // } else {
  //   const dom = document.createElement(element.type);
  //   if (element.props !== null) {
  //     for (const [key, value] of Object.entries(element.props)) {
  //       if (!isAttribute(key)) continue;
  //       dom.setAttribute(key, value);
  //     }
  //     element.props.children.forEach((child) => render(child, dom));
  //   }
  //   container.appendChild(dom);
  // }
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
