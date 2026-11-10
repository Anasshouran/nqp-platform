import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Collapse, Chip, Stack,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import CircleIcon from '@mui/icons-material/Circle';

import type { ReportingNodeTree } from '../../types/registry';

const KIND_COLORS: Record<string, 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'default'> = {
  FEDERAL: 'error',
  STATE: 'primary',
  LOCALITY: 'secondary',
  FACILITY: 'success',
  DEPARTMENT: 'info',
  SERVICE: 'default',
};

interface Props {
  nodes: ReportingNodeTree[];
  level?: number;
}

export function RegistryNodeTree({ nodes, level = 0 }: Props) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <List dense disablePadding>
      {nodes.map((node) => (
        <NodeRow key={node.id} node={node} level={level} />
      ))}
    </List>
  );
}

function NodeRow({ node, level }: { node: ReportingNodeTree; level: number }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(level < 1);
  const hasChildren = (node.children?.length ?? 0) > 0;
  // M4-4-C-Part2: navigate directly with the facility id from the tree payload
  // (no second lookup). A FACILITY node without an active assignment isn't clickable.
  const clickable = node.kind === 'FACILITY' && !!node.facility_id;

  return (
    <>
      <ListItem disablePadding>
        <ListItemButton
          onClick={() => {
            if (clickable) {
              navigate(`/app/registry/facility/${node.facility_id}`);
            } else if (hasChildren) {
              setOpen(!open);
            }
          }}
          sx={{ pl: 2 + level * 2, cursor: clickable ? 'pointer' : 'default' }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            {hasChildren ? (
              open ? <ExpandLess /> : <ExpandMore />
            ) : (
              <CircleIcon fontSize="small" sx={{ ml: 0.5 }} />
            )}
          </ListItemIcon>
          <ListItemText
            primary={
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  size="small"
                  label={node.kind}
                  color={KIND_COLORS[node.kind] ?? 'default'}
                />
                <span>{node.name_ar}</span>
                <span style={{ opacity: 0.5, fontSize: '0.75em' }}>({node.code})</span>
              </Stack>
            }
          />
        </ListItemButton>
      </ListItem>
      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <RegistryNodeTree nodes={node.children} level={level + 1} />
        </Collapse>
      )}
    </>
  );
}