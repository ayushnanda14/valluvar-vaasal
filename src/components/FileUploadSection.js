import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  IconButton,
  Paper,
  Tooltip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import { styled } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

export default function FileUploadSection({ files, onFilesChange, multiple = true }) {
  const { t, i18n } = useTranslation('common');
  const [dragActive, setDragActive] = useState(false);
  
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    onFilesChange([...files, ...selectedFiles]);
  };
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      onFilesChange([...files, ...droppedFiles]);
    }
  };
  
  const handleDelete = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  };
  
  const getFileIcon = (file) => {
    const fileType = file.type;
    
    if (fileType.includes('pdf')) {
      return <PictureAsPdfIcon color="error" />;
    } else if (fileType.includes('image')) {
      return <ImageIcon color="primary" />;
    } else {
      return <InsertDriveFileIcon color="action" />;
    }
  };
  
  return (
    <Box>
      <Paper
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        sx={{
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          backgroundColor: dragActive ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
      >
        {/* <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} /> */}

        {/* Demo image above supported formats */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {/* {t('fileUpload.demoTooltipTitle', 'Example of a Jathak Document')} */}
          </Typography>
          <Box
            component="img"
            src={'/images/jathak-demo.png'}
            alt={t('fileUpload.demoTooltipAlt', 'Example Jathak Document')}
            sx={{
              width: '100%',
              maxWidth: 220,
              height: 'auto',
              maxHeight: 140,
              borderRadius: '4px',
              objectFit: 'contain',
              mx: 'auto',
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)'
            }}
          />
        </Box>

        <Typography variant="h6" gutterBottom>
          {t('fileUpload.dragDropTitle', 'Drag & Drop Files Here')}
        </Typography>

        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ mb: 2 }}
        >
          {t('fileUpload.supportedFormats', 'Supported formats: PDF, JPG, PNG, DOC, DOCX')}
        </Typography>
        
        <Button
          component="label"
          variant="contained"
          color="primary"
        >
          {t('fileUpload.browseFiles', 'Browse Files')}
          <VisuallyHiddenInput 
            type="file" 
            onChange={handleFileChange} 
            multiple={multiple}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
        </Button>
      </Paper>
      
      {files.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('fileUpload.uploadedFiles', 'Uploaded Files')} ({files.length})
          </Typography>
          
          <List>
            {files.map((file, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleDelete(index)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemIcon>
                  {getFileIcon(file)}
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
} 