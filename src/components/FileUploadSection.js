import React, { useEffect, useMemo, useState } from 'react';
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
  Tooltip,
  useTheme,
  useMediaQuery
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

export default function FileUploadSection({ 
  files, 
  onFilesChange, 
  multiple = true,
  accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx',
  showPreview = false,
  previewMaxHeight = 140
}) {
  const { t, i18n } = useTranslation('common');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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

  // Create/revoke object URLs for image previews
  const [previewUrls, setPreviewUrls] = useState([]);
  useEffect(() => {
    if (!showPreview) return;
    const urls = files
      .filter((f) => f && f.type && f.type.startsWith('image/'))
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPreviewUrls(urls);
    return () => {
      urls.forEach(({ url }) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, showPreview]);
  
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

  const truncateFileName = (fileName, maxLength = 30) => {
    if (fileName.length <= maxLength) return fileName;
    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4) + '...';
    return `${truncatedName}.${extension}`;
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Paper
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        sx={{
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: { xs: 2, md: 3 },
          textAlign: 'center',
          backgroundColor: dragActive ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
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

        <Typography 
          variant="h6" 
          gutterBottom
          sx={{
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto'
          }}
        >
          {t('fileUpload.dragDropTitle', 'Drag & Drop Files Here')}
        </Typography>

        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 2,
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto'
          }}
        >
          {t('fileUpload.supportedFormats', 'Supported formats: PDF, JPG, PNG, DOC, DOCX')}
        </Typography>
        
        <Button
          component="label"
          variant="contained"
          color="primary"
          sx={{
            overflow: 'hidden',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
            minWidth: { xs: 'auto', md: '120px' },
            px: { xs: 2, md: 3 }
          }}
        >
          {t('fileUpload.browseFiles', 'Browse Files')}
          <VisuallyHiddenInput 
            type="file" 
            onChange={handleFileChange} 
            multiple={multiple}
            accept={accept}
          />
        </Button>
      </Paper>
      
      {files.length > 0 && (
        <Box sx={{ mt: 3, width: '100%' }}>
          <Typography 
            variant="subtitle1" 
            gutterBottom
            sx={{
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              hyphens: 'auto'
            }}
          >
            {t('fileUpload.uploadedFiles', 'Uploaded Files')} ({files.length})
          </Typography>
          
          <List sx={{ width: '100%' }}>
            {files.map((file, index) => (
              <ListItem
                key={index}
                sx={{
                  width: '100%',
                  boxSizing: 'border-box',
                  flexWrap: 'wrap',
                  gap: 1
                }}
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    onClick={() => handleDelete(index)}
                    sx={{ flexShrink: 0 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemIcon sx={{ flexShrink: 0 }}>
                  {getFileIcon(file)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Tooltip title={file.name} placement="top">
                      <Typography
                        sx={{
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word',
                          hyphens: 'auto',
                          maxWidth: '100%',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {isMobile ? truncateFileName(file.name, 25) : file.name}
                      </Typography>
                    </Tooltip>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        hyphens: 'auto'
                      }}
                    >
                      {`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                    </Typography>
                  }
                  sx={{
                    minWidth: 0,
                    flex: 1,
                    overflow: 'hidden'
                  }}
                />
              </ListItem>
            ))}
          </List>

          {showPreview && previewUrls.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Image preview</Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: 2
                }}
              >
                {previewUrls.map(({ file, url }, idx) => (
                  <Box
                    key={`${file.name}-${idx}`}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'background.paper'
                    }}
                  >
                    <Box
                      component="img"
                      src={url}
                      alt={file.name}
                      sx={{
                        maxWidth: '100%',
                        maxHeight: previewMaxHeight,
                        objectFit: 'contain',
                        borderRadius: '4px'
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
} 