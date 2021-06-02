import { render, screen } from "@testing-library/react";
// import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/extend-expect";

import { ClassListItem } from "../class-list-item";

const classDefault = {
  color: "#F59E0B",
  name: "someClass",
  shortcut: "myShortcut",
};
const classCreate = { type: "CreateClassItem", name: "nonExistingClass" };

test("should display class name", () => {
  render(
    <ClassListItem
      highlight={false}
      index={0}
      item={classDefault}
      itemProps={{}}
    />
  );
  expect(screen.queryByText(/someClass/i)).toBeInTheDocument();
  expect(screen.queryByText(/Create class/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/myShortcut/i)).toBeInTheDocument();
});

test("should propose to create class", () => {
  render(
    <ClassListItem
      highlight={false}
      index={0}
      item={classCreate}
      itemProps={{}}
    />
  );
  expect(screen.queryByText(/nonExistingClass/i)).toBeInTheDocument();
  expect(screen.queryByText(/Create class/i)).toBeInTheDocument();
});
