import React from 'react';
import { Badge, Box } from '@mui/material';

const NotificationBadge = ({ count, showExclamation = false, color = "error" }) => {
  return (
    <Badge
      badgeContent={showExclamation ? "!" : count}
      color={color}
      sx={{
        '& .MuiBadge-badge': {
          fontSize: '0.7rem',
          height: '18px',
          minWidth: '18px',
          padding: '0 4px'
        }
      }}
    >
      <Box component="span" sx={{ mx: 0.5 }} />
    </Badge>
  );
};

export default NotificationBadge; 