import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  FormControlLabel,
  Switch,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const ImageCropper = ({ open, onClose, imageFile, onCropComplete, circular = true }) => {
  const theme = useTheme();
  const [crop, setCrop] = useState({
    unit: 'px',
    width: 300,
    height: 300,
    x: 0,
    y: 0
  });
  const [imageSrc, setImageSrc] = useState(null);
  const [isCircular, setIsCircular] = useState(circular);
  const imgRef = useRef(null);

  // Load image when file changes
  React.useEffect(() => {
    if (imageFile && open) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result);
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile, open]);

  const handleCropChange = (newCrop) => {
    setCrop(newCrop);
  };

  const createCircularCanvas = (canvas, ctx, size) => {
    // Create a circular clipping path
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
    ctx.clip();
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !crop.width || !crop.height) {
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size to 300x300
    const outputSize = 300;
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Calculate crop dimensions
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    const pixelCrop = {
      x: crop.x * scaleX,
      y: crop.y * scaleY,
      width: crop.width * scaleX,
      height: crop.height * scaleY,
    };

    if (isCircular) {
      // Create circular crop
      createCircularCanvas(canvas, ctx, outputSize);
    }

    // Draw the cropped image
    ctx.drawImage(
      imgRef.current,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputSize,
      outputSize
    );

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create a new file with the cropped image
        const croppedFile = new File([blob], imageFile.name, {
          type: imageFile.type,
          lastModified: Date.now(),
        });
        onCropComplete(croppedFile);
        onClose();
      }
    }, imageFile.type, 0.9); // 0.9 quality for better file size
  };

  const handleClose = () => {
    setImageSrc(null);
    setCrop({
      unit: 'px',
      width: 300,
      height: 300,
      x: 0,
      y: 0
    });
    setIsCircular(circular);
    onClose();
  };

  const handleCircularToggle = (event) => {
    setIsCircular(event.target.checked);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
          Crop Profile Photo
        </Typography>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: '"Cormorant Garamond", serif' }}>
          Drag and resize the crop area to select the portion of your photo. The final image will be 300x300 pixels.
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isCircular}
                onChange={handleCircularToggle}
                color="primary"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
                Circular crop (recommended for profile photos)
              </Typography>
            }
          />
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 400,
          backgroundColor: theme.palette.grey[50],
          borderRadius: 1,
          p: 2
        }}>
          {imageSrc && (
            <ReactCrop
              crop={crop}
              onChange={handleCropChange}
              aspect={1}
              minWidth={100}
              minHeight={100}
              circularCrop={isCircular}
              style={{
                maxWidth: '100%',
                maxHeight: '400px',
                borderRadius: isCircular ? '50%' : '0',
                overflow: 'hidden'
              }}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '400px',
                  display: 'block'
                }}
              />
            </ReactCrop>
          )}
        </Box>
        
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
            {isCircular ? 'Your photo will be cropped to a perfect circle' : 'Your photo will be cropped to a square'}
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit" sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
          Cancel
        </Button>
        <Button 
          onClick={handleCropComplete} 
          variant="contained" 
          color="primary"
          disabled={!crop.width || !crop.height}
          sx={{ fontFamily: '"Cormorant Garamond", serif' }}
        >
          Crop & Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageCropper; 