import { List as ListIcon, Mail, Search } from 'lucide-react'
import AppLink from './app-link'

const Footer = () => {
  return (
    <footer className="visible md:hidden btm-nav z-55 flex justify-between p-0 w-full">
      <AppLink role="menuitem" to="/" className="p-4 flex-1 flex justify-center">
        <Search className="inline-block" size={24} />
      </AppLink>
      <AppLink role="menuitem" to="/lists" className="p-4 flex-1 flex justify-center">
        <span className="inline-block relative">
          <ListIcon className="inline-block" />
        </span>
      </AppLink>
      <AppLink role="menuitem" to="/invites" className="p-4 flex-1 flex justify-center">
        <Mail className="inline-block" />
      </AppLink>
    </footer>
  )
}

export default Footer
