import os
from PIL import Image
import numpy as np
import colorsys

# Function to compute the average color of an image
def get_average_color(image_path):
    with Image.open(image_path) as img:
        img = img.convert('RGB')  # Ensure the image is in RGB mode
        np_img = np.array(img)  # Convert image to numpy array
        avg_color = np.mean(np_img, axis=(0, 1))  # Compute the mean of RGB channels
        return avg_color

# Function to convert RGB to HSB (Hue, Saturation, Brightness)
def rgb_to_hsb(rgb_color):
    r, g, b = rgb_color / 255.0  # Normalize RGB values to [0, 1] range
    return colorsys.rgb_to_hsv(r, g, b)  # Convert RGB to HSB

# Function to rename images based on color similarity (HSB) in two steps
def rename_images_by_color_similarity(folder_path):
    image_files = [f for f in os.listdir(folder_path) if f.endswith('.png')]
    
    # Create a list to store (file_name, avg_color, hsb_color) tuples
    image_colors = []
    
    for file_name in image_files:
        image_path = os.path.join(folder_path, file_name)
        avg_color = get_average_color(image_path)  # Get average color in RGB
        hsb_color = rgb_to_hsb(avg_color)  # Convert the RGB color to HSB (Hue, Saturation, Brightness)
        image_colors.append((file_name, avg_color, hsb_color))
    
    # Sort images first by Hue, then by Saturation, and finally by Brightness
    image_colors.sort(key=lambda x: (x[2][0], x[2][1], x[2][2]))  # Sort by H, S, B
    
    # Step 1: Rename the files to temporary names to avoid conflicts
    for index, (file_name, avg_color, hsb_color) in enumerate(image_colors):
        # Create a temporary name by adding a prefix (e.g., "temp_")
        ext = os.path.splitext(file_name)[1]  # Extract the file extension
        temp_name = f"temp_{index + 1:03d}{ext}"  # Temporary name
        old_path = os.path.join(folder_path, file_name)
        new_path = os.path.join(folder_path, temp_name)
        os.rename(old_path, new_path)
    
    # Step 2: Rename the files from the temporary names to the final sorted names
    for index, (file_name, avg_color, hsb_color) in enumerate(image_colors):
        # Create the final sorted name
        ext = os.path.splitext(file_name)[1]
        final_name = f"{index + 1:03d}{ext}"  # Final name (e.g., "001.png")
        temp_name = f"temp_{index + 1:03d}{ext}"  # Match the temporary name from step 1
        old_path = os.path.join(folder_path, temp_name)
        new_path = os.path.join(folder_path, final_name)
        os.rename(old_path, new_path)
        
        # Print the renaming information along with the average color and HSB
        print(f"Renamed {file_name} to {final_name} | Average Color (R,G,B): {avg_color} | HSB: {hsb_color}")

# Specify the folder containing the PNG images
folder_path = '.'

# Rename images based on color similarity (HSB)
rename_images_by_color_similarity(folder_path)
