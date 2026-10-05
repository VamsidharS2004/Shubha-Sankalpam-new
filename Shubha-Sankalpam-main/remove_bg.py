from PIL import Image
import sys

def remove_background(input_path, output_path, threshold=50):
    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()
        
        # Get background color from the top-left corner
        bg_color = datas[0]
        
        newData = []
        for item in datas:
            # Check if the pixel is close to the background color
            if (abs(item[0] - bg_color[0]) < threshold and 
                abs(item[1] - bg_color[1]) < threshold and 
                abs(item[2] - bg_color[2]) < threshold):
                # Replace with transparent pixel
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
                
        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Successfully saved to {output_path}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    input_file = r"c:\Users\Admin\Desktop\Sample\puja-site-pro\frontend\assets\images\logo.png"
    output_file = r"c:\Users\Admin\Desktop\Sample\puja-site-pro\frontend\assets\images\logo_transparent.png"
    remove_background(input_file, output_file)
