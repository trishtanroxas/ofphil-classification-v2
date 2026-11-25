import json
from pathlib import Path
from update_baselines import update_tabular_model_notebook

# Update XGBoost
update_tabular_model_notebook(
    nb_path=Path("experiments/notebooks/05_model_selection_and_training/03_gradient_boosting_models/01_xgboost.ipynb"),
    model_name="XGBoost",
    model_type="gradient_boosting",
    model_import_line="from xgboost import XGBClassifier",
    base_pipeline_code="Pipeline([('prep', preprocessor), ('clf', XGBClassifier(eval_metric='logloss', random_state=RANDOM_SEED, n_jobs=-1))])",
    param_grid_code="param_grid = {'clf__n_estimators': [100, 200], 'clf__max_depth': [3, 5, 7], 'clf__learning_rate': [0.01, 0.05, 0.1], 'clf__subsample': [0.8, 1.0]}",
    final_fit_importance_code="""final_pipe = Pipeline([('prep', preprocessor), ('clf', XGBClassifier(n_estimators=100, max_depth=3, learning_rate=0.05, eval_metric='logloss', random_state=RANDOM_SEED, n_jobs=-1))])
final_pipe.fit(X_train_full, y_train_full)
importances = final_pipe.named_steps['clf'].feature_importances_
df_importance = pd.DataFrame({'feature': feature_cols, 'importance': importances}).sort_values(by='importance', ascending=False).reset_index(drop=True)""",
    importance_filename="feature_importances.csv"
)

# Update CatBoost
update_tabular_model_notebook(
    nb_path=Path("experiments/notebooks/05_model_selection_and_training/03_gradient_boosting_models/02_catboost.ipynb"),
    model_name="CatBoost",
    model_type="gradient_boosting",
    model_import_line="from catboost import CatBoostClassifier",
    base_pipeline_code="Pipeline([('prep', preprocessor), ('clf', CatBoostClassifier(loss_function='Logloss', verbose=0, random_seed=RANDOM_SEED))])",
    param_grid_code="param_grid = {'clf__iterations': [100, 200], 'clf__depth': [4, 6], 'clf__learning_rate': [0.03, 0.1]}",
    final_fit_importance_code="""final_pipe = Pipeline([('prep', preprocessor), ('clf', CatBoostClassifier(iterations=150, depth=4, learning_rate=0.05, loss_function='Logloss', verbose=0, random_seed=RANDOM_SEED))])
final_pipe.fit(X_train_full, y_train_full)
importances = final_pipe.named_steps['clf'].get_feature_importance()
df_importance = pd.DataFrame({'feature': feature_cols, 'importance': importances}).sort_values(by='importance', ascending=False).reset_index(drop=True)""",
    importance_filename="feature_importances.csv"
)

print("XGBoost and CatBoost notebooks updated successfully.")
