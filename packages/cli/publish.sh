#!/bin/bash

# Function to display usage
usage() {
  echo "Usage: $0 {patch|minor|major}"
  exit 1
}

# Check if a parameter is provided
if [ -z "$1" ]; then
  usage
fi

VERSION_TYPE=$1

# Check if the parameter is valid
if [[ "$VERSION_TYPE" != "patch" && "$VERSION_TYPE" != "minor" && "$VERSION_TYPE" != "major" ]]; then
  usage
fi

# # Update the version using npm
# npm version $VERSION_TYPE

# # Get the new version
# NEW_VERSION=$(npm pkg get version | tr -d '"')

# # Push the changes to github
# git push

# # Tag the commit with the version name and push it
# git tag v$NEW_VERSION
# git push origin v$NEW_VERSION

# # Publish the package
# npm publish
