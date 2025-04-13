import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Button,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import { Document, Page, pdfjs } from 'react-pdf';

// Set up the worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function FilePreviewModal({ open, onClose, file }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);

  // Reset states when file changes
  useEffect(() => {
    if (file) {
      setLoading(true);
      setPageNumber(1);
      setNumPages(null);

      // For non-image and non-PDF files, we can set loading to false immediately
      const fileType = file.type || '';
      if (!fileType.startsWith('image/') && fileType !== 'application/pdf') {
        setLoading(false);
      }
    }
  }, [file]);

  // Handle PDF document loading
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  // Handle image loading
  const handleImageLoad = () => {
    setLoading(false);
  };

  // Go to next page in PDF
  const goToNextPage = () => {
    if (pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
    }
  };

  // Go to previous page in PDF
  const goToPrevPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  };

  // Download the file
  const handleDownload = () => {
    if (file?.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!file) return null;

  // Render content based on file type
  const renderFileContent = () => {
    if (!file.url) return <Typography>File not available</Typography>;

    const fileType = file.type || '';

    console.log('fileType', fileType, file);

    // Image files
    if (fileType.startsWith('image/')) {
      return (
        <Box sx={{ textAlign: 'center', pt: 2 }}>
          <img
            src={file.url}
            alt={file.name}
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(80vh - 100px)',
              objectFit: 'contain'
            }}
            onLoad={handleImageLoad}
          />
        </Box>
      );
    }

    // PDF files
    else if (fileType === 'application/pdf') {
      return (
        <Box sx={{ textAlign: 'center', pt: 2 }}>
          <Document
            file={file.url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<CircularProgress />}
            onError={() => setLoading(false)}
          >
            <Page
              pageNumber={pageNumber}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              width={Math.min(600, window.innerWidth - 80)}
            />
          </Document>

          {!loading && numPages > 1 && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                disabled={pageNumber <= 1}
                onClick={goToPrevPage}
              >
                Previous
              </Button>
              <Typography>
                Page {pageNumber} of {numPages}
              </Typography>
              <Button
                variant="outlined"
                disabled={pageNumber >= numPages}
                onClick={goToNextPage}
              >
                Next
              </Button>
            </Box>
          )}
        </Box>
      );
    }

    // Other files - show icon and download button
    else {
      return (
        <Box sx={{
          textAlign: 'center',
          pt: 4,
          pb: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}>
          <Box sx={{ fontSize: 80, color: 'primary.main', mb: 2 }}>
            {fileType === 'application/pdf' ? (
              <PictureAsPdfIcon fontSize="inherit" />
            ) : fileType.startsWith('image/') ? (
              <ImageIcon fontSize="inherit" />
            ) : (
              <DescriptionIcon fontSize="inherit" />
            )}
          </Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {file.name || 'Unknown File'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This file type cannot be previewed directly.
          </Typography>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
          >
            Download File
          </Button>
        </Box>
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: fullScreen ? '100%' : 'auto',
          maxHeight: fullScreen ? '100%' : '90vh'
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Typography variant="h6" sx={{
          fontFamily: '"Cormorant Garamond", serif',
          fontWeight: 600,
          pr: 4
        }} noWrap>
          {file.name || 'File Preview'}
        </Typography>
        <Box>
          <IconButton
            edge="end"
            color="primary"
            onClick={handleDownload}
            aria-label="download"
            sx={{ mr: 1 }}
          >
            <DownloadIcon />
          </IconButton>
          <IconButton
            edge="end"
            onClick={onClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, position: 'relative', padding: '2em' }}>
        {loading && (
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}>
            <CircularProgress />
          </Box>
        )}
        {renderFileContent()}
      </DialogContent>
    </Dialog>
  );
} 