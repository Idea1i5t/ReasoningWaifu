# Run with: source scripts/env.sh (Bash)
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  echo 'Run this in your current shell: source scripts/env.sh' >&2
  exit 1
fi
_rw_project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ ! -x "$_rw_project_root/.tools/node/bin/node" ]]; then
  echo 'First run: python3 scripts/setup_node.py' >&2
  unset _rw_project_root
  return 1
fi
case ":$PATH:" in
  *":$_rw_project_root/.tools/node/bin:"*) ;;
  *) export PATH="$_rw_project_root/.tools/node/bin:$PATH" ;;
esac
unset _rw_project_root
