
ssh-keygen -t ed25519 -C "k2k1422@gmail.com"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/github

sudo apt update -y
sudo apt install git -ysudo apt update


python manage.py makemigrations
python manage.py migrate
python manage.py collectstatic




sudo systemctl restart nginx

sudo systemctl restart gunicorn





