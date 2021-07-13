import { IconButton, Tooltip } from "@chakra-ui/react";
import { RiCheckboxBlankLine } from "react-icons/ri";
import { FaDrawPolygon } from "react-icons/fa";
import { useHotkeys } from "react-hotkeys-hook";

import { useLabellingStore, Tools } from "../../../connectors/labelling-state";

import { keymap } from "../../../keymap";

export type Props = {};

export const DrawingTool = () => {
  const isImageLoading = useLabellingStore((state) => state.isImageLoading);
  const selectedTool = useLabellingStore((state) => state.selectedTool);
  const setSelectedTool = useLabellingStore((state) => state.setSelectedTool);

  useHotkeys(
    keymap.toolBoundingBox.key,
    () => setSelectedTool(Tools.BOX),
    {},
    []
  );
  useHotkeys(
    keymap.toolPolygon.key,
    () => setSelectedTool(Tools.POLYGON),
    {},
    []
  );
  return (
    <>
      <Tooltip
        label={`Drawing tool [${keymap.toolBoundingBox.key}]`}
        placement="right"
        openDelay={300}
      >
        <IconButton
          icon={<RiCheckboxBlankLine size="1.3em" />}
          isDisabled={isImageLoading}
          role="checkbox"
          aria-checked={selectedTool === Tools.BOX}
          backgroundColor="white"
          aria-label="Drawing tool"
          pointerEvents="initial"
          onClick={() => setSelectedTool(Tools.BOX)}
          isActive={selectedTool === Tools.BOX}
        />
      </Tooltip>
      <Tooltip
        label={`Drawing tool [${keymap.toolPolygon.key}]`}
        placement="right"
        openDelay={300}
      >
        <IconButton
          icon={<FaDrawPolygon size="1.3em" />}
          isDisabled={isImageLoading}
          role="checkbox"
          aria-checked={selectedTool === Tools.POLYGON}
          backgroundColor="white"
          aria-label="Drawing tool"
          pointerEvents="initial"
          onClick={() => setSelectedTool(Tools.POLYGON)}
          isActive={selectedTool === Tools.POLYGON}
        />
      </Tooltip>
    </>
  );
};
