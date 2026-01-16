from PIL import Image

def get_bg_color(image_path):
    img = Image.open(image_path)
    rgb_im = img.convert('RGB')
    # Get top-left pixel color
    bg_color = rgb_im.getpixel((0, 0))
    print(f"Top-left pixel color: {bg_color}")
    
    # Get top-right pixel color just in case
    bg_color_2 = rgb_im.getpixel((img.width-1, 0))
    print(f"Top-right pixel color: {bg_color_2}")

if __name__ == "__main__":
    get_bg_color("dino_pirate_source.jpg")
