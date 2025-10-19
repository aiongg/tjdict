import yaml
import sys
import os
from typing import Set, Union, List

def extract_pos_values(data, pos_values: Set[str] = None) -> Set[str]:
    if pos_values is None:
        pos_values = set()
    
    if isinstance(data, dict):
        for key, value in data.items():
            if key == "pos":
                if isinstance(value, list):
                    pos_values.update(value)
                else:
                    pos_values.add(value)
            else:
                extract_pos_values(value, pos_values)
    
    elif isinstance(data, list):
        for item in data:
            extract_pos_values(item, pos_values)
    
    return pos_values

def get_unique_pos_values_from_file(yaml_file_path: str, pos_values: Set[str]) -> None:
    try:
        with open(yaml_file_path, 'r') as file:
            data = yaml.safe_load(file)
        pos_values.update(extract_pos_values(data))
    except Exception as e:
        print(f"Error processing YAML file {yaml_file_path}: {e}")

def get_unique_pos_values_from_directory(directory_path: str) -> List[str]:
    pos_values = set()
    try:
        for filename in os.listdir(directory_path):
            if filename.endswith(('.yaml', '.yml')):
                file_path = os.path.join(directory_path, filename)
                get_unique_pos_values_from_file(file_path, pos_values)
        return sorted(list(pos_values))
    except Exception as e:
        print(f"Error accessing directory {directory_path}: {e}")
        return []

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract_pos_values.py <directory_path>")
        sys.exit(1)
    
    directory_path = sys.argv[1]
    unique_pos = get_unique_pos_values_from_directory(directory_path)
    print("Unique pos values:", unique_pos)