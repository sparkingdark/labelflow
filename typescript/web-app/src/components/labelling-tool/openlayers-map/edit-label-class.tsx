import { forwardRef, useMemo } from "react";
import { useQuery, useApolloClient } from "@apollo/client";
import gql from "graphql-tag";
import { useHotkeys } from "react-hotkeys-hook";

import { ClassSelectionPopover } from "../../class-selection-popover";
import { useLabellingStore } from "../../../connectors/labelling-state";
import { useUndoStore } from "../../../connectors/undo-store";
import { createNewLabelClassAndUpdateLabelCurry } from "../../../connectors/undo-store/effects/create-label-class-and-update-label";
import { createUpdateLabelClassOfLabelEffect } from "../../../connectors/undo-store/effects/update-label-class-of-label";
import { keymap } from "../../../keymap";

const labelClassesQuery = gql`
  query getLabelClasses {
    labelClasses {
      id
      name
      color
    }
  }
`;

const labelQuery = gql`
  query getLabel($id: ID!) {
    label(where: { id: $id }) {
      id
      labelClass {
        id
      }
    }
  }
`;

export const EditLabelClass = forwardRef<
  HTMLDivElement | null,
  {
    isOpen: boolean;
    onClose: () => void;
  }
>(({ isOpen, onClose }, ref) => {
  const client = useApolloClient();
  const { data } = useQuery(labelClassesQuery);
  const { perform } = useUndoStore();
  const labelClasses = data?.labelClasses ?? [];
  const selectedLabelId = useLabellingStore((state) => state.selectedLabelId);
  const isContextMenuOpen = useLabellingStore(
    (state) => state.isContextMenuOpen
  );
  const { data: labelQueryData } = useQuery(labelQuery, {
    variables: { id: selectedLabelId },
    skip: selectedLabelId == null,
  });
  const selectedLabelClassId = labelQueryData?.label?.labelClass?.id ?? null;
  const createNewClass = useMemo(
    () =>
      createNewLabelClassAndUpdateLabelCurry({
        labelClasses,
        perform,
        onClose,
        client,
      }),
    [labelClasses]
  );
  useHotkeys(
    keymap.changeClass.key,
    (keyboardEvent) => {
      if (isOpen) {
        // We do not want to interfere with the class menu shortcuts if this modal is closed
        const digit = Number(keyboardEvent.code[5]);
        const indexOfLabelClass = (digit + 9) % 10;
        if (indexOfLabelClass < labelClasses.length) {
          perform(
            createUpdateLabelClassOfLabelEffect(
              {
                selectedLabelId,
                selectedLabelClassId: labelClasses[indexOfLabelClass]?.id,
              },
              { client }
            )
          );
          onClose();
        }
      }
    },
    {},
    [labelClasses, isOpen]
  );

  return (
    <div ref={ref}>
      <ClassSelectionPopover
        isOpen={isOpen}
        onClose={onClose}
        activateShortcuts={isContextMenuOpen}
        trigger={<div style={{ width: 0, height: 0 }} />} // Needed to have the popover displayed preventing overflow
        labelClasses={labelClasses}
        selectedLabelClassId={selectedLabelClassId}
        createNewClass={async (name) => createNewClass(name, selectedLabelId)}
        onSelectedClassChange={(item) => {
          perform(
            createUpdateLabelClassOfLabelEffect(
              {
                selectedLabelId,
                selectedLabelClassId: item?.id ?? null,
              },
              { client }
            )
          );
          onClose();
        }}
      />
    </div>
  );
});