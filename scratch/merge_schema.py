import re

with open("prisma/schema.prisma", "r") as f:
    content = f.read()

# The content has conflict markers
# Let's find the HEAD and main sections
match = re.search(r"<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> main", content, re.DOTALL)
if not match:
    print("Conflict markers not found or already resolved!")
    exit(1)

head_sec = match.group(1)
main_sec = match.group(2)

# We want to use the main_sec as the base (since it has onDelete: Cascade),
# but we need to inject the Institution relations into User model,
# and append the Institution models to the bottom.

# 1. Find User model in main_sec and add:
#   institutionStudent       InstitutionStudent?
#   institutionTutors        InstitutionTutor[]
user_pattern = r"(model User \{.*?\n\})"
user_match = re.search(user_pattern, main_sec, re.DOTALL)
if not user_match:
    print("User model not found in main section!")
    exit(1)

user_content = user_match.group(1)
# Insert fields before the closing brace
user_lines = user_content.split("\n")
insert_idx = len(user_lines) - 2 # right before "}"
user_lines.insert(insert_idx, "  institutionStudent       InstitutionStudent?")
user_lines.insert(insert_idx + 1, "  institutionTutors        InstitutionTutor[]")
new_user_content = "\n".join(user_lines)

main_sec = main_sec.replace(user_content, new_user_content)

# 2. Extract Institution models from head_sec.
# These models are: Institution, InstitutionStaff, InstitutionStudent, InstitutionTutor
inst_models = ""
for model_name in ["Institution", "InstitutionStaff", "InstitutionStudent", "InstitutionTutor"]:
    model_pattern = rf"(model {model_name} \{{.*?\n\}})"
    model_match = re.search(model_pattern, head_sec, re.DOTALL)
    if model_match:
        inst_models += "\n\n" + model_match.group(1)
    else:
        print(f"Model {model_name} not found in HEAD section!")

# Append these models to the end of main_sec
resolved_schema = main_sec + inst_models + "\n"

# Write the resolved schema back to prisma/schema.prisma
with open("prisma/schema.prisma", "w") as f:
    f.write(resolved_schema)

print("prisma/schema.prisma conflict resolved successfully!")
