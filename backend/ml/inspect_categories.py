import pandas as pd

df = pd.read_csv('data/irrigation_dataset_PROJECT_FINAL.csv')
for col in ['crop_type', 'soil_type', 'crop_growth_stage', 'season', 'region', 'irrigation_type', 'water_source', 'mulching_used']:
    print(col, '->', sorted(df[col].unique().tolist()))